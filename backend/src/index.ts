import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { matchRoutes } from './api/match.js';
import { summaryRoutes } from './api/summary.js';
import { chatRoutes } from './api/chat.js';
import { questionsRoutes } from './api/questions.js';
import { crawlRoutes } from './api/crawl.js';
import { initDatabase } from './index/database.js';
import { initMatcher } from './matching/matcher.js';
import { seedSampleTopics } from './crawler/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api', matchRoutes);
app.use('/api', summaryRoutes);
app.use('/api', chatRoutes);
app.use('/api', questionsRoutes);
app.use('/api', crawlRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function start(): Promise<void> {
  try {
    await initDatabase();
    console.log('[Cognitia] Database initialized');
    
    await seedSampleTopics();
    
    await initMatcher();
    console.log('[Cognitia] Topic matcher initialized');
    
    app.listen(PORT, () => {
      console.log(`[Cognitia] Backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[Cognitia] Failed to start:', error);
    process.exit(1);
  }
}

start();
