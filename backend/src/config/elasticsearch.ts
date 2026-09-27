import { Client } from '@elastic/elasticsearch';
import { env } from './env';

export const esClient = new Client({
  node: env.ELASTICSEARCH_NODE,
  maxRetries: 3,
  requestTimeout: 5000,
});

export async function checkESConnection() {
  try {
    const ping = await esClient.ping();
    if (ping) {
      console.log('✅ Elasticsearch connected successfully');
    }
  } catch (error) {
    console.warn('⚠️ Elasticsearch not reachable at', env.ELASTICSEARCH_NODE, '- falling back to DB search');
  }
}
