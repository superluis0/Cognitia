import type {
  MessageType,
  MessageResponse,
  MatchResponse,
  SummaryResponse,
  ChatResponse,
  QuickQuestionsResponse,
  ExtensionSettings
} from '../../../shared/types';

const DEFAULT_BACKEND_URL = 'http://localhost:3001';

async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.sync.get(['cognitiaSettings']);
  return result.cognitiaSettings || {
    enabled: true,
    backendUrl: DEFAULT_BACKEND_URL
  };
}

async function handleGetMatches(
  tweetIds: string[]
): Promise<MessageResponse<MatchResponse>> {
  try {
    const settings = await getSettings();
    
    if (!settings.enabled) {
      return { success: true, data: { results: [] } };
    }
    
    const response = await fetch(`${settings.backendUrl}/api/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(settings.xApiToken && { 'X-API-Token': settings.xApiToken })
      },
      body: JSON.stringify({ tweetIds, xApiToken: settings.xApiToken })
    });
    
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('[Cognitia] Match error:', error);
    return { success: false, error: String(error) };
  }
}

async function handleGetSummary(
  topic: string,
  context?: string
): Promise<MessageResponse<SummaryResponse>> {
  try {
    const settings = await getSettings();
    
    const response = await fetch(`${settings.backendUrl}/api/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, context })
    });
    
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('[Cognitia] Summary error:', error);
    return { success: false, error: String(error) };
  }
}

async function handleChat(
  topic: string,
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<MessageResponse<ChatResponse>> {
  try {
    const settings = await getSettings();
    
    const response = await fetch(`${settings.backendUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, message, history })
    });
    
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('[Cognitia] Chat error:', error);
    return { success: false, error: String(error) };
  }
}

async function handleGetQuickQuestions(
  topic: string
): Promise<MessageResponse<QuickQuestionsResponse>> {
  try {
    const settings = await getSettings();
    
    const response = await fetch(`${settings.backendUrl}/api/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic })
    });
    
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('[Cognitia] Quick questions error:', error);
    return { success: false, error: String(error) };
  }
}

chrome.runtime.onMessage.addListener((message: MessageType, sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case 'GET_MATCHES':
        return handleGetMatches(message.payload.tweetIds);
      
      case 'GET_SUMMARY':
        return handleGetSummary(message.payload.topic, message.payload.context);
      
      case 'CHAT':
        return handleChat(
          message.payload.topic,
          message.payload.message,
          message.payload.history
        );
      
      case 'GET_QUICK_QUESTIONS':
        return handleGetQuickQuestions(message.payload.topic);
      
      case 'OPEN_SIDEBAR':
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, message);
          }
        });
        return { success: true, data: null };
      
      case 'CLOSE_SIDEBAR':
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, message);
          }
        });
        return { success: true, data: null };
      
      default:
        return { success: false, error: 'Unknown message type' };
    }
  })().then(sendResponse);
  
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Cognitia] Extension installed');
  
  chrome.storage.sync.get(['cognitiaSettings'], (result) => {
    if (!result.cognitiaSettings) {
      chrome.storage.sync.set({
        cognitiaSettings: {
          enabled: true,
          backendUrl: DEFAULT_BACKEND_URL
        }
      });
    }
  });
});
