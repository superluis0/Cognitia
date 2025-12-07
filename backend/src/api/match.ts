import { Router } from 'express';
import { getTweetsByIds, TweetWithAuthor } from '../xapi/client.js';
import { findMatches, TopicMatch } from '../matching/matcher.js';

const router = Router();

interface MatchRequest {
  tweetIds: string[];
  xApiToken?: string;
}

interface TweetWithMatches {
  tweet: {
    id: string;
    text: string;
    authorId?: string;
    author?: TweetWithAuthor['author'];
  };
  matches: TopicMatch[];
}

router.post('/match', async (req, res) => {
  try {
    const { tweetIds, xApiToken } = req.body as MatchRequest;
    
    if (!tweetIds || !Array.isArray(tweetIds) || tweetIds.length === 0) {
      return res.status(400).json({ error: 'tweetIds array is required' });
    }
    
    const token = xApiToken || req.headers['x-api-token'] as string;
    
    const tweets = await getTweetsByIds(tweetIds, token);
    
    const results: TweetWithMatches[] = tweets.map(tweet => {
      const matches = findMatches(tweet.text);
      
      return {
        tweet: {
          id: tweet.id,
          text: tweet.text,
          authorId: tweet.authorId,
          author: tweet.author
        },
        matches
      };
    });
    
    res.json({ results });
  } catch (error) {
    console.error('[Match API] Error:', error);
    res.status(500).json({ error: String(error) });
  }
});

export { router as matchRoutes };
