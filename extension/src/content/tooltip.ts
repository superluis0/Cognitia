import type { Topic, SummaryResponse } from '../../../shared/types';
import { renderMarkdown, sanitizeHtml } from './markdown';

let tooltipElement: HTMLElement | null = null;
let currentTopic: Topic | null = null;
let hideTimeout: ReturnType<typeof setTimeout> | null = null;

export function createTooltip(): HTMLElement {
  if (tooltipElement) {
    return tooltipElement;
  }
  
  tooltipElement = document.createElement('div');
  tooltipElement.className = 'cognitia-tooltip';
  tooltipElement.innerHTML = `
    <div class="cognitia-tooltip-title"></div>
    <div class="cognitia-tooltip-summary">
      <div class="cognitia-loading">
        <div class="cognitia-loading-spinner"></div>
      </div>
    </div>
    <div class="cognitia-tooltip-actions">
      <button class="cognitia-tooltip-btn">Open Details</button>
      <a class="cognitia-tooltip-link" href="#" target="_blank">
        View on Grokipedia
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </a>
    </div>
  `;
  
  tooltipElement.addEventListener('mouseenter', () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  });
  
  tooltipElement.addEventListener('mouseleave', () => {
    hideTooltip();
  });
  
  const detailsBtn = tooltipElement.querySelector('.cognitia-tooltip-btn');
  detailsBtn?.addEventListener('click', () => {
    if (currentTopic) {
      chrome.runtime.sendMessage({
        type: 'OPEN_SIDEBAR',
        payload: { topic: currentTopic }
      });
      hideTooltip(true);
    }
  });
  
  document.body.appendChild(tooltipElement);
  return tooltipElement;
}

export async function showTooltip(target: HTMLElement, topic: Topic): Promise<void> {
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
  
  const tooltip = createTooltip();
  currentTopic = topic;
  
  const titleEl = tooltip.querySelector('.cognitia-tooltip-title') as HTMLElement;
  const summaryEl = tooltip.querySelector('.cognitia-tooltip-summary') as HTMLElement;
  const linkEl = tooltip.querySelector('.cognitia-tooltip-link') as HTMLAnchorElement;
  
  titleEl.textContent = topic.title;
  summaryEl.innerHTML = '<div class="cognitia-loading"><div class="cognitia-loading-spinner"></div></div>';
  linkEl.href = topic.url;
  
  positionTooltip(tooltip, target);
  tooltip.classList.add('visible');
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_SUMMARY',
      payload: { topic: topic.title }
    });
    
    if (response.success && currentTopic?.id === topic.id) {
      summaryEl.innerHTML = sanitizeHtml(renderMarkdown(response.data.summary));
    } else if (!response.success && currentTopic?.id === topic.id) {
      summaryEl.innerHTML = sanitizeHtml(renderMarkdown(topic.summary || 'Unable to load summary.'));
    }
  } catch (error) {
    if (currentTopic?.id === topic.id) {
      summaryEl.innerHTML = sanitizeHtml(renderMarkdown(topic.summary || 'Unable to load summary.'));
    }
  }
}

export function hideTooltip(immediate = false): void {
  if (immediate) {
    if (tooltipElement) {
      tooltipElement.classList.remove('visible');
    }
    currentTopic = null;
    return;
  }
  
  hideTimeout = setTimeout(() => {
    if (tooltipElement) {
      tooltipElement.classList.remove('visible');
    }
    currentTopic = null;
  }, 200);
}

function positionTooltip(tooltip: HTMLElement, target: HTMLElement): void {
  const targetRect = target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  
  let top = targetRect.bottom + 8;
  let left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
  
  if (left < 10) {
    left = 10;
  } else if (left + tooltipRect.width > window.innerWidth - 10) {
    left = window.innerWidth - tooltipRect.width - 10;
  }
  
  if (top + tooltipRect.height > window.innerHeight - 10) {
    top = targetRect.top - tooltipRect.height - 8;
  }
  
  tooltip.style.top = `${top + window.scrollY}px`;
  tooltip.style.left = `${left}px`;
}
