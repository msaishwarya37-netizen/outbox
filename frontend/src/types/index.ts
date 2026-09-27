export type EmailStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  slackConnected: boolean;
  slackTeamName?: string;
}

export interface ScheduledEmail {
  id: string;
  userId: string;
  recipient: string;
  subject: string;
  body: string;
  sender: string;
  scheduledTime: string;
  status: EmailStatus;
  jobId?: string;
  sentAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchedulePayload {
  recipients: string[];
  subject: string;
  body: string;
  sender: string;
  scheduledTime: string;
  customMaxPerHour?: number;
  customMaxPerSender?: number;
}
