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

// ============================================
// FACT-CHECK FUNCTIONS
// ============================================

interface ExtractedClaim {
  text: string;
  topic: string;
}

interface ClaimsExtraction {
  claims: ExtractedClaim[];
}

interface VerdictResult {
  verdict: 'true' | 'false' | 'partially-true' | 'unverifiable';
  explanation: string;
}

export async function extractClaimsAndTopics(tweetText: string): Promise<ClaimsExtraction> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a fact-checking assistant. Analyze tweets and extract factual claims that can be verified.
For each claim, identify the main topic that would have a Wikipedia/Grokipedia page.
Only extract claims that make specific factual assertions (dates, numbers, events, relationships).
Skip opinions, questions, and vague statements.
Return valid JSON only.`
    },
    {
      role: 'user',
      content: `Analyze this tweet and extract verifiable factual claims:

"${tweetText}"

Return JSON in this exact format:
{
  "claims": [
    { "text": "the specific factual claim", "topic": "Main_Topic_Name" }
  ]
}

If there are no verifiable claims, return: { "claims": [] }`
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
      max_tokens: 500,
      temperature: 0.3
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`xAI API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json() as ChatCompletionResponse;
  const content = data.choices[0]?.message?.content || '{"claims": []}';
  
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { claims: [] };
  } catch {
    console.error('[Grok] Failed to parse claims extraction:', content);
    return { claims: [] };
  }
}

export async function verdictWithGrokipediaContext(
  claim: string,
  topic: string,
  grokipediaContent: string
): Promise<VerdictResult> {
  // Truncate content if too long
  const maxContentLength = 6000;
  const truncatedContent = grokipediaContent.length > maxContentLength
    ? grokipediaContent.substring(0, maxContentLength) + '...[truncated]'
    : grokipediaContent;
  
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a precise and fair fact-checker. You have access to:
1. Grokipedia content (provided below)
2. Live web search results
3. Live X/Twitter search results

Your job is to verify claims accurately. Be VERY careful about marking things as "false" - only do so if you have clear evidence contradicting the claim.

If the Grokipedia content doesn't contain relevant information about the specific claim, acknowledge this and use your web/X search results instead.

Guidelines:
- If the claim is broadly accurate, mark it "true" even if minor details differ
- If parts are true and parts are false, mark it "partially-true"
- Only mark "false" if the claim is clearly and demonstrably wrong
- If you cannot find enough information to verify, mark "unverifiable"

Return valid JSON only.`
    },
    {
      role: 'user',
      content: `CLAIM TO VERIFY: "${claim}"

GROKIPEDIA CONTENT FOR "${topic}" (use as one reference, but also search for more recent information):
${truncatedContent}

Please search the web and X/Twitter for the latest information about this claim, then provide your verdict.

Return JSON in this exact format:
{
  "verdict": "true" OR "false" OR "partially-true" OR "unverifiable",
  "explanation": "2-3 sentence explanation. If Grokipedia didn't have relevant info, mention that and explain what sources you used."
}`
    }
  ];
  
  const response = await fetch(`${XAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`
    },
    body: JSON.stringify({
      model: 'grok-3-fast',
      messages,
      max_tokens: 400,
      temperature: 0.2,
      search_parameters: {
        mode: 'auto',
        return_citations: true
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`xAI API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json() as ChatCompletionResponse;
  const content = data.choices[0]?.message?.content || '';
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        verdict: parsed.verdict || 'unverifiable',
        explanation: parsed.explanation || 'Unable to determine verdict.'
      };
    }
  } catch {
    console.error('[Grok] Failed to parse verdict:', content);
  }
  
  return {
    verdict: 'unverifiable',
    explanation: 'Unable to parse fact-check response.'
  };
}

export async function verdictWithOwnKnowledge(
  claim: string,
  topic: string
): Promise<VerdictResult> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a precise and fair fact-checker with access to live web search and X/Twitter search.

There is no Grokipedia page for this topic, so please:
1. Search the web for reliable sources about this claim
2. Search X/Twitter for recent posts and updates about this topic
3. Provide a verdict based on what you find

Guidelines:
- Be VERY careful about marking things as "false" - only do so with clear evidence
- If the claim is broadly accurate, mark it "true"
- If you cannot find enough information, mark "unverifiable" rather than guessing
- Mention that Grokipedia didn't have information on this topic

Return valid JSON only.`
    },
    {
      role: 'user',
      content: `CLAIM TO VERIFY: "${claim}"
TOPIC: "${topic}"

Please search the web and X/Twitter for information about this claim and provide your verdict.

Return JSON in this exact format:
{
  "verdict": "true" OR "false" OR "partially-true" OR "unverifiable",
  "explanation": "2-3 sentence explanation. Mention that Grokipedia didn't have this information, and explain what sources you found."
}`
    }
  ];
  
  const response = await fetch(`${XAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`
    },
    body: JSON.stringify({
      model: 'grok-3-fast',
      messages,
      max_tokens: 400,
      temperature: 0.2,
      search_parameters: {
        mode: 'auto',
        return_citations: true
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`xAI API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json() as ChatCompletionResponse;
  const content = data.choices[0]?.message?.content || '';
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        verdict: parsed.verdict || 'unverifiable',
        explanation: parsed.explanation || 'Unable to determine verdict.'
      };
    }
  } catch {
    console.error('[Grok] Failed to parse verdict:', content);
  }
  
  return {
    verdict: 'unverifiable',
    explanation: 'Unable to parse fact-check response.'
  };
}
