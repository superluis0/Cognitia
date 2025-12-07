import { Router } from 'express';
import { chat } from '../grok/client.js';

const router = Router();

interface ChatRequest {
  topic: string;
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}

router.post('/chat', async (req, res) => {
  try {
    const { topic, message, history } = req.body as ChatRequest;
    
    if (!topic || !message) {
      return res.status(400).json({ error: 'topic and message are required' });
    }
    
    const response = await chat(topic, message, history || []);
    
    res.json({ response });
  } catch (error) {
    console.error('[Chat API] Error:', error);
    res.status(500).json({ error: String(error) });
  }
});

export { router as chatRoutes };
