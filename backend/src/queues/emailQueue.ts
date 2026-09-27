import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export interface EmailJobData {
  emailId: string;
  userId: string;
  recipient: string;
  subject: string;
  body: string;
  sender: string;
  scheduledTime: string;
  customMaxPerHour?: number;
  customMaxPerSender?: number;
}

export const EMAIL_QUEUE_NAME = 'email-scheduler-queue';

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  },
});

export async function addEmailJobToQueue(jobData: EmailJobData) {
  const scheduledTimestamp = new Date(jobData.scheduledTime).getTime();
  const delay = Math.max(0, scheduledTimestamp - Date.now());

  return emailQueue.add('send-email', jobData, {
    jobId: jobData.emailId, // Idempotent unique key per email
    delay,
  });
}

export async function addBulkEmailJobsToQueue(jobsData: EmailJobData[]) {
  const now = Date.now();
  const bulkJobs = jobsData.map((job) => {
    const scheduledTimestamp = new Date(job.scheduledTime).getTime();
    const delay = Math.max(0, scheduledTimestamp - now);
    return {
      name: 'send-email',
      data: job,
      opts: {
        jobId: job.emailId, // Enforces unique deduplication in BullMQ
        delay,
      },
    };
  });

  return emailQueue.addBulk(bulkJobs);
}

export async function removeEmailJobFromQueue(jobId: string) {
  const job = await emailQueue.getJob(jobId);
  if (job) {
    await job.remove();
    console.log(`🗑️ Removed job ${jobId} from queue`);
  }
}
