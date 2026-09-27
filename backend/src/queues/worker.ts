import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { env } from '../config/env';
import { EMAIL_QUEUE_NAME, EmailJobData, emailQueue } from './emailQueue';
import { prisma } from '../config/db';
import { EmailStatus } from '@prisma/client';
import { sendEmailViaEthereal } from '../services/etherealService';
import { checkAndIncrementRateLimit } from '../services/rateLimiterService';
import { sendSlackRateLimitNotification } from '../services/slackService';
import { indexEmail } from '../services/esService';

export function setupEmailWorker() {
  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { emailId, userId, recipient, subject, body, sender, customMaxPerHour, customMaxPerSender } = job.data;
      console.log(`🚀 Processing job ${job.id} for email ${emailId} -> ${recipient}`);

      // 1. Idempotency Guard: Verify DB record state before sending
      const emailRecord = await prisma.scheduledEmail.findUnique({
        where: { id: emailId },
      });

      if (!emailRecord) {
        console.log(`⚠️ Email record ${emailId} not found in DB. Skipping job.`);
        return { status: 'skipped', reason: 'Record deleted' };
      }

      if (emailRecord.status === EmailStatus.SENT) {
        console.log(`ℹ️ Email ${emailId} was already sent. Skipping (Idempotency enforced).`);
        return { status: 'skipped', reason: 'Already sent' };
      }

      // 2. Minimum Delay Enforcement
      if (env.MIN_DELAY_MS_BETWEEN_SENDS > 0) {
        await new Promise((resolve) => setTimeout(resolve, env.MIN_DELAY_MS_BETWEEN_SENDS));
      }

      // 3. Redis-Backed Hourly Rate Limit Check
      const rateLimitResult = await checkAndIncrementRateLimit(sender, customMaxPerHour, customMaxPerSender);

      if (!rateLimitResult.allowed) {
        const nextHourTime = new Date(Date.now() + rateLimitResult.msUntilNextHour);
        console.warn(`🛑 Rate limit exceeded for sender ${sender}. Rescheduling to ${nextHourTime.toISOString()}`);

        // Reschedule BullMQ job to next hour window with slight jitter
        const rescheduledDelay = rateLimitResult.msUntilNextHour + Math.floor(Math.random() * 2000);
        await emailQueue.add('send-email', job.data, {
          jobId: `${emailId}-retry-${Date.now()}`,
          delay: rescheduledDelay,
        });

        // Trigger real Slack alert to user if Slack is connected
        await sendSlackRateLimitNotification(userId, {
          senderEmail: sender,
          recipientEmail: recipient,
          limit: customMaxPerSender || env.MAX_EMAILS_PER_HOUR_PER_SENDER,
          currentCount: rateLimitResult.senderCount,
          rescheduledTime: nextHourTime,
          reason: rateLimitResult.reason,
        });

        return {
          status: 'rescheduled',
          rescheduledFor: nextHourTime.toISOString(),
          reason: rateLimitResult.reason,
        };
      }

      // 4. Send Email via Ethereal SMTP
      try {
        const sendResult = await sendEmailViaEthereal({
          from: sender,
          to: recipient,
          subject,
          body,
        });

        const updated = await prisma.scheduledEmail.update({
          where: { id: emailId },
          data: {
            status: EmailStatus.SENT,
            sentAt: new Date(),
            jobId: job.id,
            errorMessage: null,
          },
        });

        // 5. Index sent status in Elasticsearch
        await indexEmail({
          id: updated.id,
          userId: updated.userId,
          recipient: updated.recipient,
          subject: updated.subject,
          body: updated.body,
          sender: updated.sender,
          status: updated.status,
          scheduledTime: updated.scheduledTime,
          sentAt: updated.sentAt,
          createdAt: updated.createdAt,
        });

        console.log(`✅ Email ${emailId} successfully sent & indexed.`);
        return { status: 'sent', messageId: sendResult.messageId, previewUrl: sendResult.previewUrl };
      } catch (err: any) {
        console.error(`❌ Error sending email ${emailId}:`, err.message);

        await prisma.scheduledEmail.update({
          where: { id: emailId },
          data: {
            status: EmailStatus.FAILED,
            errorMessage: err.message,
            jobId: job.id,
          },
        });

        // Re-throw so BullMQ handles configured retries
        throw err;
      }
    },
    {
      connection: redisConnection,
      concurrency: env.WORKER_CONCURRENCY,
    }
  );

  worker.on('completed', (job) => {
    console.log(`🎉 Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`💥 Job ${job?.id} failed with error:`, err.message);
  });

  console.log(`👷 BullMQ Worker started with concurrency = ${env.WORKER_CONCURRENCY}`);
  return worker;
}
