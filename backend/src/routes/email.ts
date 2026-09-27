import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { createBatchEmailRecords, getEmailsByUser, cancelEmailRecord, updateEmailStatus } from '../services/emailService';
import { addBulkEmailJobsToQueue, removeEmailJobFromQueue, EmailJobData } from '../queues/emailQueue';
import { searchEmails, indexEmail } from '../services/esService';
import { EmailStatus } from '@prisma/client';

const router = Router();

// POST /api/emails/schedule - Schedule single or bulk emails
router.post('/schedule', requireAuth, async (req: AuthRequest, res) => {
  const { recipients, subject, body, sender, scheduledTime, customMaxPerHour, customMaxPerSender } = req.body;

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'Recipients must be a non-empty array of email strings' });
  }

  if (!subject || !body || !sender || !scheduledTime) {
    return res.status(400).json({ error: 'Missing required fields: subject, body, sender, scheduledTime' });
  }

  const parsedTime = new Date(scheduledTime);
  if (isNaN(parsedTime.getTime())) {
    return res.status(400).json({ error: 'Invalid scheduledTime date format' });
  }

  try {
    const userId = req.user!.id;

    // 1. Prepare email objects for batch DB insert
    const emailObjects = recipients.map((recipient: string) => ({
      recipient: recipient.trim(),
      subject,
      body,
      sender,
      scheduledTime: parsedTime,
    }));

    // 2. Batch Insert into PostgreSQL
    const insertedRecords = await createBatchEmailRecords(userId, emailObjects);

    // 3. Map to BullMQ delayed job payloads
    const jobsData: EmailJobData[] = insertedRecords.map((record) => ({
      emailId: record.id,
      userId: record.userId,
      recipient: record.recipient,
      subject: record.subject,
      body: record.body,
      sender: record.sender,
      scheduledTime: record.scheduledTime.toISOString(),
      customMaxPerHour,
      customMaxPerSender,
    }));

    // 4. Batch enqueue into BullMQ (atomic Redis pipeline supporting 1000+ jobs)
    const bullJobs = await addBulkEmailJobsToQueue(jobsData);

    // 5. Index in Elasticsearch & update jobId in DB
    await Promise.all(
      insertedRecords.map(async (record, index) => {
        const bullJob = bullJobs[index];
        const jobId = bullJob?.id || record.id;
        await updateEmailStatus(record.id, EmailStatus.PENDING, { jobId });
        await indexEmail({
          id: record.id,
          userId: record.userId,
          recipient: record.recipient,
          subject: record.subject,
          body: record.body,
          sender: record.sender,
          status: EmailStatus.PENDING,
          scheduledTime: record.scheduledTime,
          createdAt: record.createdAt,
        });
      })
    );

    return res.status(201).json({
      message: `Successfully scheduled ${insertedRecords.length} email(s)`,
      count: insertedRecords.length,
      sampleEmail: insertedRecords[0],
    });
  } catch (error: any) {
    console.error('Error scheduling emails:', error);
    return res.status(500).json({ error: error.message || 'Internal server error while scheduling emails' });
  }
});

// GET /api/emails - List emails for current user
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { status } = req.query;

  try {
    let emailStatus: EmailStatus | undefined;
    if (status && typeof status === 'string') {
      const upper = status.toUpperCase();
      if (upper === 'PENDING' || upper === 'SENT' || upper === 'FAILED') {
        emailStatus = upper as EmailStatus;
      }
    }

    const emails = await getEmailsByUser(req.user!.id, emailStatus);
    return res.json({ count: emails.length, data: emails });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/emails/search - Search emails via Elasticsearch
router.get('/search', requireAuth, async (req: AuthRequest, res) => {
  const { q, subject, recipient, status, startDate, endDate } = req.query;

  try {
    const result = await searchEmails({
      userId: req.user!.id,
      q: q as string,
      subject: subject as string,
      recipient: recipient as string,
      status: status as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /api/emails/:id - Cancel scheduled email
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    const cancelled = await cancelEmailRecord(id, req.user!.id);
    if (!cancelled) {
      return res.status(404).json({ error: 'Email record not found' });
    }

    // Remove from BullMQ queue if pending
    if (cancelled.jobId) {
      await removeEmailJobFromQueue(cancelled.jobId);
    }

    return res.json({ message: 'Email scheduled job cancelled successfully', id });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;
