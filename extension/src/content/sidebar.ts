import type { Topic, ChatMessage } from '../../../shared/types';

let sidebarElement: HTMLElement | null = null;
let currentTopic: Topic | null = null;
let chatHistory: ChatMessage[] = [];

export function createSidebar(): HTMLElement {
  if (sidebarElement) {
    return sidebarElement;
  }
  
  sidebarElement = document.createElement('div');
  sidebarElement.className = 'cognitia-sidebar';
  sidebarElement.innerHTML = `
    <div class="cognitia-sidebar-header">
      <span class="cognitia-sidebar-title"></span>
      <button class="cognitia-sidebar-close">&times;</button>
    </div>
    <div class="cognitia-sidebar-content">
      <div class="cognitia-sidebar-section">
        <div class="cognitia-sidebar-section-title">Summary</div>
        <div class="cognitia-sidebar-summary">
          <div class="cognitia-loading">
            <div class="cognitia-loading-spinner"></div>
          </div>
        </div>
      </div>
      <div class="cognitia-sidebar-section">
        <a class="cognitia-grokipedia-link" href="#" target="_blank">
          View on Grokipedia
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
      </div>
      <div class="cognitia-sidebar-section">
        <div class="cognitia-sidebar-section-title">Quick Questions</div>
        <div class="cognitia-quick-questions">
          <div class="cognitia-loading">
            <div class="cognitia-loading-spinner"></div>
          </div>
        </div>
      </div>
      <div class="cognitia-sidebar-section">
        <div class="cognitia-sidebar-section-title">Chat History</div>
        <div class="cognitia-chat-history"></div>
      </div>
    </div>
    <div class="cognitia-chat-container">
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
  const sidebar = createSidebar();
  currentTopic = topic;
  chatHistory = [];
  
  const titleEl = sidebar.querySelector('.cognitia-sidebar-title') as HTMLElement;
  const summaryEl = sidebar.querySelector('.cognitia-sidebar-summary') as HTMLElement;
  const linkEl = sidebar.querySelector('.cognitia-grokipedia-link') as HTMLAnchorElement;
  const questionsEl = sidebar.querySelector('.cognitia-quick-questions') as HTMLElement;
  const historyEl = sidebar.querySelector('.cognitia-chat-history') as HTMLElement;
  
  titleEl.textContent = topic.title;
  linkEl.href = topic.url;
  summaryEl.innerHTML = '<div class="cognitia-loading"><div class="cognitia-loading-spinner"></div></div>';
  questionsEl.innerHTML = '<div class="cognitia-loading"><div class="cognitia-loading-spinner"></div></div>';
  historyEl.innerHTML = '';
  
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
      container.textContent = response.data.summary;
    } else {
      container.textContent = topic.summary || 'Unable to load summary.';
    }
  } catch (error) {
    container.textContent = topic.summary || 'Unable to load summary.';
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
  if (!currentTopic || !sidebarElement) return;
  
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
    const response = await chrome.runtime.sendMessage({
      type: 'CHAT',
      payload: {
        topic: currentTopic.title,
        message,
        history: chatHistory.slice(0, -1)
      }
    });
    
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
  messageEl.style.cssText = `
    padding: 10px 14px;
    margin-bottom: 8px;
    border-radius: 12px;
    font-size: 14px;
    line-height: 1.4;
    ${role === 'user' 
      ? 'background: #1DA1F2; color: #fff; margin-left: 20px;' 
      : 'background: #273340; color: #e7e9ea; margin-right: 20px;'}
  `;
  messageEl.textContent = content;
  container.appendChild(messageEl);
  container.scrollTop = container.scrollHeight;
}

export function closeSidebar(): void {
  if (sidebarElement) {
    sidebarElement.classList.remove('open');
  }
  currentTopic = null;
  chatHistory = [];
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'OPEN_SIDEBAR' && message.payload?.topic) {
    openSidebar(message.payload.topic);
  } else if (message.type === 'CLOSE_SIDEBAR') {
    closeSidebar();
  }
});
