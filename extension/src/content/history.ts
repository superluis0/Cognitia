// History Management Module for Cognitia Extension

interface Topic {
  id: number;
  title: string;
  url: string;
  summary?: string;
  aliases?: string[];
}

interface ClaimResult {
  claim: string;
  topic: string;
  verdict: 'true' | 'false' | 'partially-true' | 'unverifiable';
  explanation: string;
  source: {
    type: 'grokipedia' | 'grok';
    topic?: string;
    url?: string;
    note?: string;
  };
}

export interface TopicHistoryItem {
  topic: Topic;
  timestamp: number;
  viewedAt: string;
}

export interface ChatHistoryItem {
  id: string;
  firstMessage: string;
  timestamp: number;
  chatType: 'general' | 'topic';
  topicTitle?: string;
  topicId?: number;
  fullConversation: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface FactCheckHistoryItem {
  id: string;
  tweetText: string;
  claimsCount: number;
  verdictSummary: 'all-true' | 'mixed' | 'all-false' | 'unverifiable';
  timestamp: number;
  analyzedAt: string;
  fullResults: ClaimResult[];
}

const MAX_TOPICS = 20;
const MAX_CHATS = 15;
const MAX_FACT_CHECKS = 15;

// Helper: Format relative time
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes === 0) return 'just now';
  if (minutes < 60) return `${minutes} min${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

// Helper: Calculate verdict summary
function calculateVerdictSummary(claims: ClaimResult[]): 'all-true' | 'mixed' | 'all-false' | 'unverifiable' {
  if (claims.length === 0) return 'unverifiable';

  const trueCount = claims.filter(c => c.verdict === 'true').length;
  const falseCount = claims.filter(c => c.verdict === 'false').length;
  const unverifiableCount = claims.filter(c => c.verdict === 'unverifiable').length;

  if (trueCount === claims.length) return 'all-true';
  if (falseCount === claims.length) return 'all-false';
  if (unverifiableCount === claims.length) return 'unverifiable';
  return 'mixed';
}

// Helper: Truncate text
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Add topic to history
export async function addTopicToHistory(topic: Topic): Promise<void> {
  try {
    const result = await chrome.storage.local.get(['recentTopics']);
    let topics: TopicHistoryItem[] = result.recentTopics || [];

    // Check if topic already exists (by id)
    const existingIndex = topics.findIndex(item => item.topic.id === topic.id);
    if (existingIndex !== -1) {
      // Move to front with updated timestamp
      topics.splice(existingIndex, 1);
    }

    // Add to front of array
    const timestamp = Date.now();
    topics.unshift({
      topic,
      timestamp,
      viewedAt: formatRelativeTime(timestamp)
    });

    // Limit to max size
    if (topics.length > MAX_TOPICS) {
      topics = topics.slice(0, MAX_TOPICS);
    }

    await chrome.storage.local.set({ recentTopics: topics });
  } catch (error) {
    console.error('[Cognitia] Error adding topic to history:', error);
  }
}

// Add chat to history
export async function addChatToHistory(
  firstMessage: string,
  chatType: 'general' | 'topic',
  fullConversation: Array<{ role: 'user' | 'assistant'; content: string }>,
  topicTitle?: string,
  topicId?: number
): Promise<string> {
  try {
    const result = await chrome.storage.local.get(['recentChats']);
    let chats: ChatHistoryItem[] = result.recentChats || [];

    // Add to front of array
    const timestamp = Date.now();
    const chatId = `chat-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
    chats.unshift({
      id: chatId,
      firstMessage: truncateText(firstMessage, 100),
      timestamp,
      chatType,
      topicTitle,
      topicId,
      fullConversation
    });

    // Limit to max size
    if (chats.length > MAX_CHATS) {
      chats = chats.slice(0, MAX_CHATS);
    }

    await chrome.storage.local.set({ recentChats: chats });
    return chatId;
  } catch (error) {
    console.error('[Cognitia] Error adding chat to history:', error);
    return '';
  }
}

// Add fact check to history
export async function addFactCheckToHistory(tweetText: string, claims: ClaimResult[]): Promise<void> {
  try {
    // Don't add if no claims found
    if (!claims || claims.length === 0) {
      return;
    }

    const result = await chrome.storage.local.get(['recentFactChecks']);
    let factChecks: FactCheckHistoryItem[] = result.recentFactChecks || [];

    // Add to front of array
    const timestamp = Date.now();
    factChecks.unshift({
      id: `factcheck-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
      tweetText: truncateText(tweetText, 100),
      claimsCount: claims.length,
      verdictSummary: calculateVerdictSummary(claims),
      timestamp,
      analyzedAt: formatRelativeTime(timestamp),
      fullResults: claims
    });

    // Limit to max size
    if (factChecks.length > MAX_FACT_CHECKS) {
      factChecks = factChecks.slice(0, MAX_FACT_CHECKS);
    }

    await chrome.storage.local.set({ recentFactChecks: factChecks });
  } catch (error) {
    console.error('[Cognitia] Error adding fact check to history:', error);
  }
}

// Get recent topics
export async function getRecentTopics(): Promise<TopicHistoryItem[]> {
  try {
    const result = await chrome.storage.local.get(['recentTopics']);
    const topics: TopicHistoryItem[] = result.recentTopics || [];

    // Update relative times
    return topics.map(item => ({
      ...item,
      viewedAt: formatRelativeTime(item.timestamp)
    }));
  } catch (error) {
    console.error('[Cognitia] Error getting recent topics:', error);
    return [];
  }
}

// Get recent chats
export async function getRecentChats(): Promise<ChatHistoryItem[]> {
  try {
    const result = await chrome.storage.local.get(['recentChats']);
    return result.recentChats || [];
  } catch (error) {
    console.error('[Cognitia] Error getting recent chats:', error);
    return [];
  }
}

// Get recent fact checks
export async function getRecentFactChecks(): Promise<FactCheckHistoryItem[]> {
  try {
    const result = await chrome.storage.local.get(['recentFactChecks']);
    const factChecks: FactCheckHistoryItem[] = result.recentFactChecks || [];

    // Update relative times
    return factChecks.map(item => ({
      ...item,
      analyzedAt: formatRelativeTime(item.timestamp)
    }));
  } catch (error) {
    console.error('[Cognitia] Error getting recent fact checks:', error);
    return [];
  }
}

// Clear all history
export async function clearAllHistory(): Promise<void> {
  try {
    await chrome.storage.local.set({
      recentTopics: [],
      recentChats: [],
      recentFactChecks: []
    });
  } catch (error) {
    console.error('[Cognitia] Error clearing all history:', error);
  }
}

// Clear topic history
export async function clearTopicHistory(): Promise<void> {
  try {
    await chrome.storage.local.set({ recentTopics: [] });
  } catch (error) {
    console.error('[Cognitia] Error clearing topic history:', error);
  }
}

// Clear chat history
export async function clearChatHistory(): Promise<void> {
  try {
    await chrome.storage.local.set({ recentChats: [] });
  } catch (error) {
    console.error('[Cognitia] Error clearing chat history:', error);
  }
}

// Clear fact check history
export async function clearFactCheckHistory(): Promise<void> {
  try {
    await chrome.storage.local.set({ recentFactChecks: [] });
  } catch (error) {
    console.error('[Cognitia] Error clearing fact check history:', error);
  }
}

// Get specific chat by ID
export async function getChatById(chatId: string): Promise<ChatHistoryItem | null> {
  try {
    const result = await chrome.storage.local.get(['recentChats']);
    const chats: ChatHistoryItem[] = result.recentChats || [];
    return chats.find(chat => chat.id === chatId) || null;
  } catch (error) {
    console.error('[Cognitia] Error getting chat by ID:', error);
    return null;
  }
}

// Get specific fact-check by ID
export async function getFactCheckById(factCheckId: string): Promise<FactCheckHistoryItem | null> {
  try {
    const result = await chrome.storage.local.get(['recentFactChecks']);
    const factChecks: FactCheckHistoryItem[] = result.recentFactChecks || [];
    return factChecks.find(fc => fc.id === factCheckId) || null;
  } catch (error) {
    console.error('[Cognitia] Error getting fact-check by ID:', error);
    return null;
  }
}

// Update chat conversation in history (for ongoing chats)
export async function updateChatConversation(
  chatId: string,
  updatedConversation: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<void> {
  try {
    const result = await chrome.storage.local.get(['recentChats']);
    let chats: ChatHistoryItem[] = result.recentChats || [];

    const index = chats.findIndex(chat => chat.id === chatId);
    if (index !== -1) {
      chats[index].fullConversation = updatedConversation;
      await chrome.storage.local.set({ recentChats: chats });
    }
  } catch (error) {
    console.error('[Cognitia] Error updating chat conversation:', error);
  }
}

// Export helper for formatting
export { formatRelativeTime };
