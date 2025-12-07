interface Tweet {
  id: string;
  text: string;
  author_id?: string;
  entities?: {
    urls?: Array<{ url: string; expanded_url: string; display_url: string }>;
    mentions?: Array<{ username: string; id: string }>;
    hashtags?: Array<{ tag: string }>;
  };
}

interface User {
  id: string;
  name: string;
  username: string;
  description?: string;
}

interface TweetLookupResponse {
  data?: Tweet[];
  includes?: {
    users?: User[];
  };
  errors?: Array<{ detail: string }>;
}

export interface TweetWithAuthor {
  id: string;
  text: string;
  authorId?: string;
  author?: {
    id: string;
    name: string;
    username: string;
    description?: string;
  };
  entities?: Tweet['entities'];
}

export async function getTweetsByIds(
  ids: string[],
  bearerToken?: string
): Promise<TweetWithAuthor[]> {
  const token = bearerToken || process.env.X_API_BEARER_TOKEN;
  
  if (!token) {
    throw new Error('X API bearer token is not configured');
  }
  
  if (ids.length === 0) {
    return [];
  }
  
  const batchSize = 100;
  const results: TweetWithAuthor[] = [];
  
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const batchResults = await fetchTweetBatch(batch, token);
    results.push(...batchResults);
  }
  
  return results;
}

async function fetchTweetBatch(
  ids: string[],
  token: string
): Promise<TweetWithAuthor[]> {
  const params = new URLSearchParams({
    ids: ids.join(','),
    'tweet.fields': 'text,author_id,entities',
    'expansions': 'author_id',
    'user.fields': 'name,username,description'
  });
  
  const response = await fetch(
    `https://api.x.com/2/tweets?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`X API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json() as TweetLookupResponse;
  
  if (data.errors) {
    console.warn('[X API] Partial errors:', data.errors);
  }
  
  if (!data.data) {
    return [];
  }
  
  const userMap = new Map<string, User>();
  data.includes?.users?.forEach(user => {
    userMap.set(user.id, user);
  });
  
  return data.data.map(tweet => {
    const author = tweet.author_id ? userMap.get(tweet.author_id) : undefined;
    
    return {
      id: tweet.id,
      text: tweet.text,
      authorId: tweet.author_id,
      author: author ? {
        id: author.id,
        name: author.name,
        username: author.username,
        description: author.description
      } : undefined,
      entities: tweet.entities
    };
  });
}
