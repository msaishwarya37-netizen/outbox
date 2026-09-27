import app from './app';
import { env } from './config/env';
import { connectDB } from './config/db';
import { checkESConnection } from './config/elasticsearch';
import { initESIndex } from './services/esService';
import { setupEmailWorker } from './queues/worker';

async function bootstrap() {
  console.log('🚀 Starting Email Job Scheduler Backend Service...');

  // Connect Database
  await connectDB();

  // Check Elasticsearch & Initialize Index
  await checkESConnection();
  await initESIndex();

  // Start BullMQ Worker Process
  setupEmailWorker();

  // Start Express HTTP Server
  app.listen(env.PORT, () => {
    console.log(`🌐 Server running at http://localhost:${env.PORT}`);
    console.log(`📊 BullMQ Live Queue Dashboard mounted at http://localhost:${env.PORT}/admin/queues`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
});
