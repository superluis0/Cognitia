import type { TopicMatch, Topic } from '../../../shared/types';
import { extractTweetIds, getTweetTextElement } from './tweetIdExtractor';
import { showTooltip, hideTooltip } from './tooltip';

const processedTweets = new Set<string>();
let currentHighlightStyle = 'dotted';

export function setHighlightStyle(style: string): void {
  currentHighlightStyle = style;
  // Update existing highlights
  const highlights = document.querySelectorAll('.cognitia-highlight');
  highlights.forEach((el) => {
    el.className = 'cognitia-highlight ' + style;
  });
}

export function getHighlightStyle(): string {
  return currentHighlightStyle;
}

export function highlightMatches(tweetId: string, matches: TopicMatch[]): void {
  if (processedTweets.has(tweetId)) {
    return;
  }
  
  const tweetMap = extractTweetIds();
  const article = tweetMap.get(tweetId);
  
  if (!article) {
    return;
  }
  
  const textElement = getTweetTextElement(article);
  if (!textElement) {
    return;
  }
  
  const sortedMatches = [...matches].sort((a, b) => b.startIndex - a.startIndex);
  
  applyHighlights(textElement, sortedMatches);
  processedTweets.add(tweetId);
}

function applyHighlights(textElement: HTMLElement, matches: TopicMatch[]): void {
  // Use text search instead of indices since X API text may differ from DOM text
  const highlightedTerms = new Set<string>();
  
  for (const match of matches) {
    const { topic, matchedText } = match;
    const termLower = matchedText.toLowerCase();
    
    // Skip if we've already highlighted this term
    if (highlightedTerms.has(termLower)) continue;
    highlightedTerms.add(termLower);
    
    // Find and highlight the term in the DOM
    highlightTermInElement(textElement, matchedText, topic);
  }
}

function highlightTermInElement(element: HTMLElement, term: string, topic: Topic): void {
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  const textNodes: Text[] = [];
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    textNodes.push(node);
  }
  
  const termLower = term.toLowerCase();
  
  for (const textNode of textNodes) {
    const text = textNode.textContent || '';
    const textLower = text.toLowerCase();
    const index = textLower.indexOf(termLower);
    
    if (index !== -1) {
      // Check word boundaries
      const before = index > 0 ? textLower[index - 1] : ' ';
      const after = index + term.length < text.length ? textLower[index + term.length] : ' ';
      
      if (isWordBoundaryChar(before) && isWordBoundaryChar(after)) {
        wrapTextWithHighlight(textNode, index, index + term.length, topic);
        return; // Only highlight first occurrence
      }
    }
  }
}

function isWordBoundaryChar(char: string): boolean {
  return /[\s.,!?;:'"()\[\]{}<>\/\-—–]/.test(char) || char === '';
}

function wrapTextWithHighlight(
  textNode: Text,
  start: number,
  end: number,
  topic: Topic
): void {
  const text = textNode.textContent || '';
  
  if (start < 0 || end > text.length || start >= end) {
    return;
  }
  
  const beforeText = text.substring(0, start);
  const matchedText = text.substring(start, end);
  const afterText = text.substring(end);
  
  const fragment = document.createDocumentFragment();
  
  if (beforeText) {
    fragment.appendChild(document.createTextNode(beforeText));
  }
  
  const highlight = document.createElement('span');
  highlight.className = 'cognitia-highlight ' + currentHighlightStyle;
  highlight.textContent = matchedText;
  highlight.dataset.topicId = String(topic.id);
  highlight.dataset.topicTitle = topic.title;
  highlight.dataset.topicUrl = topic.url;
  
  highlight.addEventListener('mouseenter', (e) => {
    showTooltip(e.target as HTMLElement, topic);
  });
  
  highlight.addEventListener('mouseleave', () => {
    hideTooltip();
  });
  
  highlight.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openSidebar(topic);
  });
  
  fragment.appendChild(highlight);
  
  if (afterText) {
    fragment.appendChild(document.createTextNode(afterText));
  }
  
  textNode.parentNode?.replaceChild(fragment, textNode);
}

function openSidebar(topic: Topic): void {
  chrome.runtime.sendMessage({
    type: 'OPEN_SIDEBAR',
    payload: { topic }
  });
}

export function clearHighlights(): void {
  const highlights = document.querySelectorAll('.cognitia-highlight');
  highlights.forEach((highlight) => {
    const text = highlight.textContent || '';
    const textNode = document.createTextNode(text);
    highlight.parentNode?.replaceChild(textNode, highlight);
  });
  processedTweets.clear();
}

export function isProcessed(tweetId: string): boolean {
  return processedTweets.has(tweetId);
}
