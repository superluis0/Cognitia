import { getTweetTextElement } from './tweetIdExtractor';
import { openFactCheck } from './sidebar';

const processedTweets = new Set<string>();
const FACT_CHECK_BUTTON_CLASS = 'cognitia-fact-check-btn';
const FACT_CHECK_CONTAINER_CLASS = 'cognitia-fact-check-container';

// Shield with magnifying glass SVG
const FACT_CHECK_ICON = `
<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 3l8 4.5v5c0 4.5-3.5 8.5-8 10-4.5-1.5-8-5.5-8-10v-5L12 3z"/>
  <circle cx="11" cy="11" r="3"/>
  <path d="M13.5 13.5L16 16"/>
</svg>
`;

function createFactCheckButton(tweetId: string, tweetText: string): HTMLElement {
  // Create container that will be positioned at top center
  const container = document.createElement('div');
  container.className = FACT_CHECK_CONTAINER_CLASS;
  
  const button = document.createElement('button');
  button.className = FACT_CHECK_BUTTON_CLASS;
  button.innerHTML = FACT_CHECK_ICON;
  button.title = 'Grok, is this true?';
  button.setAttribute('data-tweet-id', tweetId);
  button.setAttribute('aria-label', 'Grok, is this true?');
  
  // Create custom tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'cognitia-fact-check-tooltip';
  tooltip.textContent = 'Grok, is this true?';
  button.appendChild(tooltip);
  
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      openFactCheck(tweetText);
    } catch (error) {
      console.error('[Cognitia] Error opening fact check:', error);
    }
  });
  
  container.appendChild(button);
  return container;
}

function findTweetActionBar(article: HTMLElement): HTMLElement | null {
  // X's action bar is the group containing reply, retweet, like, share buttons
  // It's typically the last [role="group"] in the article, and contains buttons with specific test IDs
  const groups = article.querySelectorAll('[role="group"]');
  
  for (const group of groups) {
    // Look for the action bar that contains the reply/retweet/like buttons
    if (group.querySelector('[data-testid="reply"]') || 
        group.querySelector('[data-testid="retweet"]') ||
        group.querySelector('[data-testid="like"]')) {
      return group as HTMLElement;
    }
  }
  
  // Fallback: try to find by aria-label pattern
  const actionBar = article.querySelector('[role="group"][id]') as HTMLElement;
  if (actionBar) return actionBar;
  
  // Last resort: get the last group element
  if (groups.length > 0) {
    return groups[groups.length - 1] as HTMLElement;
  }
  
  return null;
}

function extractTweetIdFromArticle(article: HTMLElement): string | null {
  const timeLink = article.querySelector('a[href*="/status/"] time')?.parentElement;
  if (timeLink) {
    const href = timeLink.getAttribute('href');
    const match = href?.match(/\/status\/(\d+)/);
    if (match) return match[1];
  }
  
  const statusLinks = article.querySelectorAll('a[href*="/status/"]');
  for (const link of statusLinks) {
    const href = link.getAttribute('href');
    const match = href?.match(/\/status\/(\d+)/);
    if (match) return match[1];
  }
  
  return null;
}

function injectFactCheckButton(article: HTMLElement): void {
  try {
    const tweetId = extractTweetIdFromArticle(article);
    if (!tweetId) return;

    // Check if button already exists anywhere in the article
    if (article.querySelector(`.${FACT_CHECK_CONTAINER_CLASS}`)) return;

    // Get tweet text - include all text content even if no dedicated text element
    let tweetText = '';
    const tweetTextEl = getTweetTextElement(article);
    if (tweetTextEl) {
      tweetText = tweetTextEl.textContent || '';
    } else {
      // Fallback: try to get text from the article itself
      const textDiv = article.querySelector('[lang]');
      if (textDiv) {
        tweetText = textDiv.textContent || '';
      }
    }

    // Don't require text - user might want to fact-check image/media tweets too
    const container = createFactCheckButton(tweetId, tweetText || '[No text content]');

    // Simple approach: absolute position at article level
    const computedStyle = window.getComputedStyle(article);
    if (computedStyle.position === 'static') {
      article.style.position = 'relative';
    }
    article.insertBefore(container, article.firstChild);

    processedTweets.add(tweetId);
  } catch (error) {
    console.error('[Cognitia] Error injecting fact-check button:', error);
  }
}

export function injectFactCheckButtons(): void {
  const articles = document.querySelectorAll('article[data-testid="tweet"]');
  articles.forEach((article) => {
    injectFactCheckButton(article as HTMLElement);
  });
}

export function observeForFactCheckButtons(): MutationObserver {
  const observer = new MutationObserver(() => {
    injectFactCheckButtons();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  return observer;
}

export function clearFactCheckProcessed(): void {
  processedTweets.clear();
}
