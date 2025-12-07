import { Router } from 'express';
import { generateQuickQuestions } from '../grok/client.js';

const router = Router();

interface QuestionsRequest {
  topic: string;
}

router.post('/questions', async (req, res) => {
  try {
    const { topic } = req.body as QuestionsRequest;
    
    if (!topic) {
      return res.status(400).json({ error: 'topic is required' });
    }
    
    const questions = await generateQuickQuestions(topic);
    
    res.json({ questions });
  } catch (error) {
    console.error('[Questions API] Error:', error);
    res.status(500).json({ error: String(error) });
  }
});

export { router as questionsRoutes };
