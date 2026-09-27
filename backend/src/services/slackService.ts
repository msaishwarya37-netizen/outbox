import { prisma } from '../config/db';

export async function sendSlackRateLimitNotification(
  userId: string,
  details: {
    senderEmail: string;
    recipientEmail: string;
    limit: number;
    currentCount: number;
    rescheduledTime: Date;
    reason?: string;
  }
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || (!user.slackWebhookUrl && !user.slackAccessToken)) {
      // Slack isn't connected: skip silently without crashing
      return false;
    }

    const payload = {
      text: `⚠️ *Email Scheduler Rate Limit Triggered!*`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚠️ Email Hourly Rate Limit Hit',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Sender:* ${details.senderEmail}`,
            },
            {
              type: 'mrkdwn',
              text: `*Recipient:* ${details.recipientEmail}`,
            },
            {
              type: 'mrkdwn',
              text: `*Hourly Limit:* ${details.limit}`,
            },
            {
              type: 'mrkdwn',
              text: `*Rescheduled For:* ${details.rescheduledTime.toISOString()}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `_The job was automatically re-delayed into the next hour window to preserve send order without dropping emails._`,
          },
        },
      ],
    };

    if (user.slackWebhookUrl) {
      const res = await fetch(user.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        console.log(`💬 Sent Slack alert to webhook for user ${user.email}`);
        return true;
      } else {
        console.warn(`⚠️ Slack webhook failed with status ${res.status}`);
      }
    }

    return false;
  } catch (error) {
    console.error('Error sending Slack notification:', error);
    return false;
  }
}
