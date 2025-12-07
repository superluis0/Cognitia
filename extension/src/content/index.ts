import { observeTweets, observeScroll, getVisibleTweetIds } from './tweetIdExtractor';
import { highlightMatches, isProcessed, setHighlightStyle, clearHighlights } from './highlighter';
import { createTooltip } from './tooltip';
import { createSidebar } from './sidebar';
import type { TweetWithMatches } from '../../../shared/types';

const processedTweetIds = new Set<string>();
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

async function loadHighlightStyle(): Promise<void> {
  try {
    const result = await chrome.storage.sync.get(['cognitiaSettings']);
    const settings = result.cognitiaSettings || {};
    setHighlightStyle(settings.highlightStyle || 'dotted');
  } catch (error) {
    console.error('[Cognitia] Error loading highlight style:', error);
  }
}

function loadFonts(): void {
  if (!document.getElementById('cognitia-fonts')) {
    // Google Fonts for Space Grotesk and JetBrains Mono
    const googleFonts = document.createElement('link');
    googleFonts.id = 'cognitia-fonts';
    googleFonts.rel = 'stylesheet';
    googleFonts.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap';
    document.head.appendChild(googleFonts);
    
    // Fontshare for Clash Display
    const fontshare = document.createElement('link');
    fontshare.id = 'cognitia-fonts-display';
    fontshare.rel = 'stylesheet';
    fontshare.href = 'https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap';
    document.head.appendChild(fontshare);
  }
}

async function init(): Promise<void> {
  console.log('[Cognitia] Initializing...');
  
  loadFonts();
  await loadHighlightStyle();
  
  // Listen for settings changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.cognitiaSettings) {
      const newSettings = changes.cognitiaSettings.newValue || {};
      setHighlightStyle(newSettings.highlightStyle || 'dotted');
    }
  });
  
  createTooltip();
  createSidebar();
  
  const processNewTweets = async (tweetIds: string[]) => {
    const unprocessedIds = tweetIds.filter(id => !processedTweetIds.has(id) && !isProcessed(id));
    
    if (unprocessedIds.length === 0) {
      return;
    }
    
    unprocessedIds.forEach(id => processedTweetIds.add(id));
    
    try {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        console.warn('[Cognitia] Extension context invalidated. Please refresh the page.');
        return;
      }
      
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
    } catch (error: any) {
      // Handle extension context invalidated error gracefully
      if (error?.message?.includes('Extension context invalidated')) {
        console.warn('[Cognitia] Extension was updated. Please refresh the page to continue.');
        return;
      }
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
  
  // Auto-refresh every 5 minutes to pick up newly crawled topics
  setInterval(() => {
    console.log('[Cognitia] Auto-refreshing to check for new topics...');
    // Clear processed caches
    processedTweetIds.clear();
    clearHighlights();
    // Re-scan visible tweets
    const visibleIds = getVisibleTweetIds();
    if (visibleIds.length > 0) {
      processNewTweets(visibleIds);
    }
  }, REFRESH_INTERVAL_MS);
  
  console.log('[Cognitia] Initialized successfully (auto-refresh every 5 minutes)');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
