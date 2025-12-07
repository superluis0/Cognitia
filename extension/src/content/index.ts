import { observeTweets, observeScroll, getVisibleTweetIds } from './tweetIdExtractor';
import { highlightMatches, isProcessed } from './highlighter';
import { createTooltip } from './tooltip';
import { createSidebar } from './sidebar';
import type { TweetWithMatches } from '../../../shared/types';

const processedTweetIds = new Set<string>();

async function init(): Promise<void> {
  console.log('[Cognitia] Initializing...');
  
  createTooltip();
  createSidebar();
  
  const processNewTweets = async (tweetIds: string[]) => {
    const unprocessedIds = tweetIds.filter(id => !processedTweetIds.has(id) && !isProcessed(id));
    
    if (unprocessedIds.length === 0) {
      return;
    }
    
    unprocessedIds.forEach(id => processedTweetIds.add(id));
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_MATCHES',
        payload: { tweetIds: unprocessedIds }
      });
      
      if (response.success && response.data.results) {
        const results: TweetWithMatches[] = response.data.results;
        
        results.forEach(({ tweet, matches }) => {
          if (matches.length > 0) {
            highlightMatches(tweet.id, matches);
          }
        });
      }
    } catch (error) {
      console.error('[Cognitia] Error fetching matches:', error);
      unprocessedIds.forEach(id => processedTweetIds.delete(id));
    }
  };
  
  observeTweets(processNewTweets);
  observeScroll(processNewTweets);
  
  setTimeout(() => {
    const initialIds = getVisibleTweetIds();
    if (initialIds.length > 0) {
      processNewTweets(initialIds);
    }
  }, 1000);
  
  console.log('[Cognitia] Initialized successfully');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
