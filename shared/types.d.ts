export interface Topic {
    id: number;
    title: string;
    url: string;
    summary?: string;
    aliases?: string[];
}
export interface TopicMatch {
    topic: Topic;
    startIndex: number;
    endIndex: number;
    matchedText: string;
}
export interface Tweet {
    id: string;
    text: string;
    authorId: string;
    author?: {
        id: string;
        name: string;
        username: string;
        description?: string;
    };
    entities?: {
        urls?: Array<{
            url: string;
            expanded_url: string;
            display_url: string;
        }>;
        mentions?: Array<{
            username: string;
            id: string;
        }>;
        hashtags?: Array<{
            tag: string;
        }>;
    };
}
export interface TweetWithMatches {
    tweet: Tweet;
    matches: TopicMatch[];
}
export interface SummaryRequest {
    topic: string;
    context?: string;
}
export interface SummaryResponse {
    summary: string;
    topic: Topic;
}
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}
export interface ChatRequest {
    topic: string;
    message: string;
    history: ChatMessage[];
}
export interface ChatResponse {
    response: string;
}
export interface QuickQuestionsRequest {
    topic: string;
}
export interface QuickQuestionsResponse {
    questions: string[];
}
export interface MatchRequest {
    tweetIds: string[];
    xApiToken: string;
}
export interface MatchResponse {
    results: TweetWithMatches[];
}
export interface ExtensionSettings {
    enabled: boolean;
    xApiToken?: string;
    xaiApiKey?: string;
    backendUrl: string;
}
export type MessageType = {
    type: 'GET_MATCHES';
    payload: {
        tweetIds: string[];
    };
} | {
    type: 'GET_SUMMARY';
    payload: SummaryRequest;
} | {
    type: 'CHAT';
    payload: ChatRequest;
} | {
    type: 'GET_QUICK_QUESTIONS';
    payload: QuickQuestionsRequest;
} | {
    type: 'OPEN_SIDEBAR';
    payload: {
        topic: Topic;
    };
} | {
    type: 'CLOSE_SIDEBAR';
};
export type MessageResponse<T> = {
    success: true;
    data: T;
} | {
    success: false;
    error: string;
};
