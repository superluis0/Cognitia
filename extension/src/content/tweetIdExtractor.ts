export function extractTweetIds(): Map<string, HTMLElement> {
  const tweetMap = new Map<string, HTMLElement>();
  
  const articles = document.querySelectorAll('article[data-testid="tweet"]');
  
  articles.forEach((article) => {
    const tweetId = extractTweetIdFromArticle(article as HTMLElement);
    if (tweetId) {
      tweetMap.set(tweetId, article as HTMLElement);
    }
  });
  
  return tweetMap;
}

function extractTweetIdFromArticle(article: HTMLElement): string | null {
  const timeLink = article.querySelector('a[href*="/status/"] time')?.parentElement;
  if (timeLink) {
    const href = timeLink.getAttribute('href');
    const match = href?.match(/\/status\/(\d+)/);
    if (match) {
      return match[1];
    }
  }
  
  const statusLinks = article.querySelectorAll('a[href*="/status/"]');
  for (const link of statusLinks) {
    const href = link.getAttribute('href');
    const match = href?.match(/\/status\/(\d+)/);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

export function getTweetTextElement(article: HTMLElement): HTMLElement | null {
  return article.querySelector('[data-testid="tweetText"]') as HTMLElement | null;
}

export function getVisibleTweetIds(): string[] {
  const tweetMap = extractTweetIds();
  const visibleIds: string[] = [];
  
  tweetMap.forEach((element, id) => {
    if (isElementInViewport(element)) {
      visibleIds.push(id);
    }
  });
  
  return visibleIds;
}

function isElementInViewport(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  return (
    rect.top < window.innerHeight &&
    rect.bottom > 0 &&
    rect.left < window.innerWidth &&
    rect.right > 0
  );
}

export function observeTweets(callback: (tweetIds: string[]) => void): MutationObserver {
  let debounceTimer: ReturnType<typeof setTimeout>;
  
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const visibleIds = getVisibleTweetIds();
      if (visibleIds.length > 0) {
        callback(visibleIds);
      }
    }, 300);
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  return observer;
}

export function observeScroll(callback: (tweetIds: string[]) => void): () => void {
  let debounceTimer: ReturnType<typeof setTimeout>;
  
  const handleScroll = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const visibleIds = getVisibleTweetIds();
      if (visibleIds.length > 0) {
        callback(visibleIds);
      }
    }, 300);
  };
  
  window.addEventListener('scroll', handleScroll, { passive: true });
  
  return () => {
    window.removeEventListener('scroll', handleScroll);
    clearTimeout(debounceTimer);
  };
}
