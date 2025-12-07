import type { Topic, ChatMessage } from '../../../shared/types';
import { renderMarkdown, sanitizeHtml } from './markdown';

let sidebarElement: HTMLElement | null = null;
let currentTopic: Topic | null = null;
let chatHistory: ChatMessage[] = [];
let isGeneralChatMode = false;

export function createSidebar(): HTMLElement {
  if (sidebarElement) {
    return sidebarElement;
  }
  
  sidebarElement = document.createElement('div');
  sidebarElement.className = 'cognitia-sidebar';
  sidebarElement.innerHTML = `
    <div class="cognitia-sidebar-header">
      <span class="cognitia-sidebar-title"></span>
      <button class="cognitia-sidebar-close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div class="cognitia-sidebar-content">
      <div class="cognitia-sidebar-section cognitia-reveal cognitia-reveal-1">
        <div class="cognitia-sidebar-section-title">Summary</div>
        <div class="cognitia-sidebar-summary">
          <div class="cognitia-loading">
            <div class="cognitia-loading-spinner"></div>
            <span>Loading summary...</span>
          </div>
        </div>
      </div>
      <div class="cognitia-sidebar-section cognitia-reveal cognitia-reveal-2">
        <a class="cognitia-grokipedia-link" href="#" target="_blank">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4"/>
            <path d="M12 8h.01"/>
          </svg>
          View on Grokipedia
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
      </div>
      <div class="cognitia-sidebar-section cognitia-reveal cognitia-reveal-3">
        <div class="cognitia-sidebar-section-title">Quick Questions</div>
        <div class="cognitia-quick-questions">
          <div class="cognitia-loading">
            <div class="cognitia-loading-spinner"></div>
            <span>Generating questions...</span>
          </div>
        </div>
      </div>
      <div class="cognitia-sidebar-section cognitia-reveal cognitia-reveal-4">
        <div class="cognitia-sidebar-section-title">Conversation</div>
        <div class="cognitia-chat-history"></div>
      </div>
    </div>
    <div class="cognitia-chat-container cognitia-reveal cognitia-reveal-5">
      <div class="cognitia-chat-input-wrapper">
        <input type="text" class="cognitia-chat-input" placeholder="Ask about this topic..." />
        <button class="cognitia-chat-send">Send</button>
      </div>
    </div>
  `;
  
  const closeBtn = sidebarElement.querySelector('.cognitia-sidebar-close');
  closeBtn?.addEventListener('click', closeSidebar);
  
  const chatInput = sidebarElement.querySelector('.cognitia-chat-input') as HTMLInputElement;
  const sendBtn = sidebarElement.querySelector('.cognitia-chat-send');
  
  chatInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
  
  sendBtn?.addEventListener('click', sendChatMessage);
  
  document.body.appendChild(sidebarElement);
  return sidebarElement;
}

export async function openSidebar(topic: Topic): Promise<void> {
  // Always destroy existing sidebar and create fresh
  if (sidebarElement) {
    sidebarElement.remove();
    sidebarElement = null;
  }
  
  const sidebar = createSidebar();
  currentTopic = topic;
  chatHistory = [];
  isGeneralChatMode = false;
  
  const titleEl = sidebar.querySelector('.cognitia-sidebar-title') as HTMLElement;
  const summaryEl = sidebar.querySelector('.cognitia-sidebar-summary') as HTMLElement;
  const linkEl = sidebar.querySelector('.cognitia-grokipedia-link') as HTMLAnchorElement;
  const questionsEl = sidebar.querySelector('.cognitia-quick-questions') as HTMLElement;
  const historyEl = sidebar.querySelector('.cognitia-chat-history') as HTMLElement;
  
  if (titleEl) titleEl.textContent = topic.title;
  if (linkEl) linkEl.href = topic.url;
  if (summaryEl) summaryEl.innerHTML = '<div class="cognitia-loading"><div class="cognitia-loading-spinner"></div><span>Loading summary...</span></div>';
  if (questionsEl) questionsEl.innerHTML = '<div class="cognitia-loading"><div class="cognitia-loading-spinner"></div><span>Generating questions...</span></div>';
  if (historyEl) historyEl.innerHTML = '';
  
  sidebar.classList.add('open');
  
  loadSummary(topic, summaryEl);
  loadQuickQuestions(topic, questionsEl);
}

async function loadSummary(topic: Topic, container: HTMLElement): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_SUMMARY',
      payload: { topic: topic.title }
    });
    
    if (response.success) {
      container.innerHTML = sanitizeHtml(renderMarkdown(response.data.summary));
    } else {
      container.innerHTML = sanitizeHtml(renderMarkdown(topic.summary || 'Unable to load summary.'));
    }
  } catch (error) {
    container.innerHTML = sanitizeHtml(renderMarkdown(topic.summary || 'Unable to load summary.'));
  }
}

async function loadQuickQuestions(topic: Topic, container: HTMLElement): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_QUICK_QUESTIONS',
      payload: { topic: topic.title }
    });
    
    if (response.success && response.data.questions) {
      container.innerHTML = response.data.questions
        .map((q: string) => `<button class="cognitia-quick-question">${escapeHtml(q)}</button>`)
        .join('');
      
      container.querySelectorAll('.cognitia-quick-question').forEach((btn) => {
        btn.addEventListener('click', () => {
          const question = btn.textContent || '';
          const input = sidebarElement?.querySelector('.cognitia-chat-input') as HTMLInputElement;
          if (input) {
            input.value = question;
            sendChatMessage();
          }
        });
      });
    } else {
      container.innerHTML = '<p style="color: #71767b;">Unable to load questions.</p>';
    }
  } catch (error) {
    container.innerHTML = '<p style="color: #71767b;">Unable to load questions.</p>';
  }
}

async function sendChatMessage(): Promise<void> {
  if (!sidebarElement) return;
  if (!isGeneralChatMode && !currentTopic) return;
  
  const input = sidebarElement.querySelector('.cognitia-chat-input') as HTMLInputElement;
  const sendBtn = sidebarElement.querySelector('.cognitia-chat-send') as HTMLButtonElement;
  const historyEl = sidebarElement.querySelector('.cognitia-chat-history') as HTMLElement;
  
  const message = input.value.trim();
  if (!message) return;
  
  input.value = '';
  input.disabled = true;
  sendBtn.disabled = true;
  
  chatHistory.push({ role: 'user', content: message });
  appendChatMessage(historyEl, 'user', message);
  
  const loadingEl = document.createElement('div');
  loadingEl.className = 'cognitia-loading';
  loadingEl.innerHTML = '<div class="cognitia-loading-spinner"></div>';
  historyEl.appendChild(loadingEl);
  historyEl.scrollTop = historyEl.scrollHeight;
  
  try {
    let response;
    
    if (isGeneralChatMode) {
      response = await chrome.runtime.sendMessage({
        type: 'GENERAL_CHAT',
        payload: {
          message,
          history: chatHistory.slice(0, -1)
        }
      });
    } else {
      response = await chrome.runtime.sendMessage({
        type: 'CHAT',
        payload: {
          topic: currentTopic!.title,
          message,
          history: chatHistory.slice(0, -1)
        }
      });
    }
    
    loadingEl.remove();
    
    if (response.success) {
      chatHistory.push({ role: 'assistant', content: response.data.response });
      appendChatMessage(historyEl, 'assistant', response.data.response);
    } else {
      appendChatMessage(historyEl, 'assistant', 'Sorry, I encountered an error. Please try again.');
    }
  } catch (error) {
    loadingEl.remove();
    appendChatMessage(historyEl, 'assistant', 'Sorry, I encountered an error. Please try again.');
  } finally {
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  }
}

function appendChatMessage(container: HTMLElement, role: 'user' | 'assistant', content: string): void {
  const messageEl = document.createElement('div');
  messageEl.className = `cognitia-chat-message cognitia-chat-message-${role}`;
  
  if (role === 'assistant') {
    messageEl.innerHTML = sanitizeHtml(renderMarkdown(content));
  } else {
    messageEl.textContent = content;
  }
  
  container.appendChild(messageEl);
  container.scrollTop = container.scrollHeight;
}

export function closeSidebar(): void {
  if (sidebarElement) {
    sidebarElement.classList.remove('open');
    // Destroy after animation completes
    const elementToRemove = sidebarElement;
    setTimeout(() => {
      if (elementToRemove && !elementToRemove.classList.contains('open')) {
        elementToRemove.remove();
        if (sidebarElement === elementToRemove) {
          sidebarElement = null;
        }
      }
    }, 400);
  }
  currentTopic = null;
  chatHistory = [];
  isGeneralChatMode = false;
}

export async function openGeneralChat(): Promise<void> {
  // Always destroy existing sidebar and create fresh
  if (sidebarElement) {
    sidebarElement.remove();
    sidebarElement = null;
  }
  
  const sidebar = createSidebar();
  currentTopic = null;
  chatHistory = [];
  isGeneralChatMode = true;
  
  const titleEl = sidebar.querySelector('.cognitia-sidebar-title') as HTMLElement;
  const contentEl = sidebar.querySelector('.cognitia-sidebar-content') as HTMLElement;
  const inputEl = sidebar.querySelector('.cognitia-chat-input') as HTMLInputElement;
  
  if (titleEl) titleEl.textContent = 'Chat with Grok';
  
  // Hide topic-specific sections, show only chat
  if (contentEl) {
    contentEl.innerHTML = `
      <div class="cognitia-sidebar-section cognitia-reveal cognitia-reveal-1" style="flex: 1; display: flex; flex-direction: column;">
        <div class="cognitia-sidebar-section-title">Conversation</div>
        <div class="cognitia-chat-history" style="flex: 1; overflow-y: auto; min-height: 300px;"></div>
      </div>
    `;
  }
  
  if (inputEl) inputEl.placeholder = 'Ask Grok anything...';
  
  sidebar.classList.add('open');
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OPEN_SIDEBAR' && message.payload?.topic) {
    openSidebar(message.payload.topic);
    sendResponse({ success: true });
  } else if (message.type === 'OPEN_GENERAL_CHAT') {
    openGeneralChat();
    sendResponse({ success: true });
  } else if (message.type === 'CLOSE_SIDEBAR') {
    closeSidebar();
    sendResponse({ success: true });
  }
  return true;
});
