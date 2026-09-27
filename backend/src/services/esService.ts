import { esClient } from '../config/elasticsearch';
import { prisma } from '../config/db';

const ES_INDEX = 'emails';

export async function initESIndex() {
  try {
    const exists = await esClient.indices.exists({ index: ES_INDEX });
    if (!exists) {
      await esClient.indices.create({
        index: ES_INDEX,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              userId: { type: 'keyword' },
              recipient: { type: 'keyword' },
              subject: { type: 'text' },
              body: { type: 'text' },
              sender: { type: 'keyword' },
              status: { type: 'keyword' },
              scheduledTime: { type: 'date' },
              sentAt: { type: 'date' },
              createdAt: { type: 'date' },
            },
          },
        },
      });
      console.log(`✅ Created Elasticsearch index "${ES_INDEX}"`);
    }
  } catch (error) {
    console.warn(`⚠️ Could not initialize Elasticsearch index "${ES_INDEX}":`, (error as Error).message);
  }
}

export async function indexEmail(email: {
  id: string;
  userId: string;
  recipient: string;
  subject: string;
  body: string;
  sender: string;
  status: string;
  scheduledTime: Date;
  sentAt?: Date | null;
  createdAt: Date;
}) {
  try {
    await esClient.index({
      index: ES_INDEX,
      id: email.id,
      document: {
        id: email.id,
        userId: email.userId,
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        sender: email.sender,
        status: email.status,
        scheduledTime: email.scheduledTime.toISOString(),
        sentAt: email.sentAt ? email.sentAt.toISOString() : null,
        createdAt: email.createdAt.toISOString(),
      },
      refresh: 'wait_for',
    });
  } catch (error) {
    console.warn(`⚠️ Elasticsearch indexing failed for email ${email.id}:`, (error as Error).message);
  }
}

export async function searchEmails(params: {
  userId: string;
  q?: string;
  subject?: string;
  recipient?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  const isRealValue = (val?: string) =>
    Boolean(val && typeof val === 'string' && val.trim() !== '' && val.trim() !== 'undefined' && val.trim() !== 'null');

  const q = isRealValue(params.q) ? params.q!.trim() : undefined;
  const subject = isRealValue(params.subject) ? params.subject!.trim() : undefined;
  const recipient = isRealValue(params.recipient) ? params.recipient!.trim() : undefined;

  let status: string | undefined = undefined;
  if (isRealValue(params.status)) {
    const s = params.status!.trim().toUpperCase();
    if (['PENDING', 'SENT', 'FAILED'].includes(s)) {
      status = s;
    }
  }

  const startDate = isRealValue(params.startDate) ? params.startDate!.trim() : undefined;
  const endDate = isRealValue(params.endDate) ? params.endDate!.trim() : undefined;

  try {
    const must: any[] = [{ term: { userId: params.userId } }];

    if (q) {
      must.push({
        multi_match: {
          query: q,
          fields: ['subject^2', 'recipient', 'body'],
        },
      });
    }

    if (subject) {
      must.push({ match: { subject } });
    }

    if (recipient) {
      must.push({ term: { recipient: recipient.toLowerCase() } });
    }

    if (status) {
      must.push({ term: { status } });
    }

    if (startDate || endDate) {
      const range: any = {};
      if (startDate) range.gte = startDate;
      if (endDate) range.lte = endDate;
      must.push({ range: { scheduledTime: range } });
    }

    const response = await esClient.search({
      index: ES_INDEX,
      body: {
        query: { bool: { must } },
        sort: [{ scheduledTime: { order: 'desc' } }],
      },
    });

    const hits = response.hits.hits.map((hit: any) => hit._source);
    return { source: 'elasticsearch', data: hits };
  } catch (error) {
    // Fallback to database search if ES fails
    console.warn('⚠️ Elasticsearch search error, falling back to PostgreSQL query:', (error as Error).message);

    const where: any = { userId: params.userId };

    if (status) {
      where.status = status;
    }

    if (recipient) {
      where.recipient = { contains: recipient, mode: 'insensitive' };
    }

    if (subject) {
      where.subject = { contains: subject, mode: 'insensitive' };
    }

    if (q) {
      where.OR = [
        { subject: { contains: q, mode: 'insensitive' } },
        { recipient: { contains: q, mode: 'insensitive' } },
        { body: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      const scheduledTimeRange: any = {};
      if (startDate) {
        const d = new Date(startDate);
        if (!isNaN(d.getTime())) scheduledTimeRange.gte = d;
      }
      if (endDate) {
        const d = new Date(endDate);
        if (!isNaN(d.getTime())) scheduledTimeRange.lte = d;
      }
      if (Object.keys(scheduledTimeRange).length > 0) {
        where.scheduledTime = scheduledTimeRange;
      }
    }

    const data = await prisma.scheduledEmail.findMany({
      where,
      orderBy: { scheduledTime: 'desc' },
    });

    return { source: 'database', data };
  }
}
