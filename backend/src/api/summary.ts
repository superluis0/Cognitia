import { Router } from 'express';
import { generateSummary } from '../grok/client.js';
import { getTopicByTitle } from '../index/database.js';

const router = Router();

interface SummaryRequest {
  topic: string;
  context?: string;
}

router.post('/summary', async (req, res) => {
  try {
    const { topic, context } = req.body as SummaryRequest;
    
    if (!topic) {
      return res.status(400).json({ error: 'topic is required' });
    }
    
    const topicRow = getTopicByTitle(topic);
    
    const summary = await generateSummary(topic, context);
    
    res.json({
      summary,
      topic: topicRow ? {
        id: topicRow.id,
        title: topicRow.title,
        url: topicRow.url,
        summary: topicRow.summary
      } : {
        id: 0,
        title: topic,
        url: `https://grokipedia.com/page/${encodeURIComponent(topic)}`,
        summary: null
      }
    });
  } catch (error) {
    console.error('[Summary API] Error:', error);
    res.status(500).json({ error: String(error) });
  }
});

export { router as summaryRoutes };
