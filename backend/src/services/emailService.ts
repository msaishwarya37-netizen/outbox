import { prisma } from '../config/db';
import { EmailStatus } from '@prisma/client';

export async function createEmailRecord(data: {
  userId: string;
  recipient: string;
  subject: string;
  body: string;
  sender: string;
  scheduledTime: Date;
}) {
  return prisma.scheduledEmail.create({
    data: {
      userId: data.userId,
      recipient: data.recipient,
      subject: data.subject,
      body: data.body,
      sender: data.sender,
      scheduledTime: data.scheduledTime,
      status: EmailStatus.PENDING,
    },
  });
}

export async function createBatchEmailRecords(
  userId: string,
  emails: { recipient: string; subject: string; body: string; sender: string; scheduledTime: Date }[]
) {
  const records = emails.map((e) => ({
    userId,
    recipient: e.recipient,
    subject: e.subject,
    body: e.body,
    sender: e.sender,
    scheduledTime: e.scheduledTime,
    status: EmailStatus.PENDING,
  }));

  // Prisma createMany and return records
  await prisma.scheduledEmail.createMany({
    data: records,
  });

  // Retrieve inserted records for queue scheduling
  return prisma.scheduledEmail.findMany({
    where: {
      userId,
      status: EmailStatus.PENDING,
      jobId: null,
    },
    orderBy: { createdAt: 'desc' },
    take: emails.length,
  });
}

export async function updateEmailStatus(
  id: string,
  status: EmailStatus,
  extra?: { sentAt?: Date; errorMessage?: string; jobId?: string }
) {
  return prisma.scheduledEmail.update({
    where: { id },
    data: {
      status,
      ...(extra?.sentAt ? { sentAt: extra.sentAt } : {}),
      ...(extra?.errorMessage ? { errorMessage: extra.errorMessage } : {}),
      ...(extra?.jobId ? { jobId: extra.jobId } : {}),
    },
  });
}

export async function getEmailsByUser(userId: string, status?: EmailStatus) {
  return prisma.scheduledEmail.findMany({
    where: {
      userId,
      ...(status ? { status } : {}),
    },
    orderBy: { scheduledTime: 'desc' },
  });
}

export async function cancelEmailRecord(id: string, userId: string) {
  const email = await prisma.scheduledEmail.findFirst({
    where: { id, userId },
  });

  if (!email) return null;

  if (email.status === EmailStatus.SENT) {
    throw new Error('Cannot cancel an email that has already been sent');
  }

  return prisma.scheduledEmail.delete({
    where: { id },
  });
}
