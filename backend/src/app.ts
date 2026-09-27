import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import emailRoutes from './routes/email';
import slackRoutes from './routes/slack';
import { setupBullBoard } from './queues/board';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Bull-Board Queue Dashboard Route
app.use('/admin/queues', setupBullBoard());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/slack', slackRoutes);

export default app;
