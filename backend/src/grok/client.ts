const XAI_BASE_URL = 'https://api.x.ai/v1';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

function getApiKey(): string {
  const key = process.env.XAI_API_KEY;
  if (!key) {
    throw new Error('XAI_API_KEY environment variable is not set');
  }
  return key;
}

export async function generateSummary(topic: string, context?: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are a concise encyclopedia assistant. Provide factual, informative summaries suitable for tooltips.'
    },
    {
      role: 'user',
      content: context
        ? `Provide a concise 2-3 sentence summary of "${topic}" relevant to this context: "${context}"`
        : `Provide a concise 2-3 sentence summary of "${topic}".`
    }
  ];
  
  const response = await fetch(`${XAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`
    },
    body: JSON.stringify({
      model: 'grok-4-1-fast-non-reasoning-latest',
      messages,
      max_tokens: 150,
      temperature: 0.7
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`xAI API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json() as ChatCompletionResponse;
  return data.choices[0]?.message?.content || 'Unable to generate summary.';
}

export async function chat(
  topic: string,
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are an expert assistant knowledgeable about "${topic}". Be helpful, accurate, and concise in your responses. If you're unsure about something, say so.`
    },
    ...history.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    })),
    {
      role: 'user',
      content: message
    }
  ];
  
  const response = await fetch(`${XAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`
    },
    body: JSON.stringify({
      model: 'grok-4-1-fast-non-reasoning-latest',
      messages,
      max_tokens: 2000,
      temperature: 0.7
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`xAI API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json() as ChatCompletionResponse;
  return data.choices[0]?.message?.content || 'Unable to generate response.';
}

export async function generalChat(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are Grok, a helpful AI assistant created by xAI. You are knowledgeable, witty, and always aim to provide accurate and helpful responses. You can discuss any topic the user wants to explore.`
    },
    ...history.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    })),
    {
      role: 'user',
      content: message
    }
  ];
  
  const response = await fetch(`${XAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`
    },
    body: JSON.stringify({
      model: 'grok-4-1-fast-reasoning-latest',
      messages,
      max_tokens: 4000,
      temperature: 0.7
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`xAI API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json() as ChatCompletionResponse;
  return data.choices[0]?.message?.content || 'Unable to generate response.';
}

export async function generateQuickQuestions(topic: string): Promise<string[]> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are a helpful assistant. Generate engaging follow-up questions about topics. Return only a JSON object with a "questions" array containing 4 question strings.'
    },
    {
      role: 'user',
      content: `Generate 4 engaging follow-up questions a curious reader might ask about "${topic}". Return as JSON: {"questions": ["question1", "question2", "question3", "question4"]}`
    }
  ];
  
  const response = await fetch(`${XAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`
    },
    body: JSON.stringify({
      model: 'grok-4-1-fast-non-reasoning-latest',
      messages,
      max_tokens: 300,
      temperature: 0.8
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`xAI API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json() as ChatCompletionResponse;
  const content = data.choices[0]?.message?.content || '{"questions": []}';
  
  try {
    const parsed = JSON.parse(content);
    return parsed.questions || [];
  } catch {
    const matches = content.match(/"([^"]+\?)"/g);
    if (matches) {
      return matches.slice(0, 4).map(m => m.replace(/"/g, ''));
    }
    return [];
  }
}
