import { getAllTopics, TopicRow } from '../index/database.js';

interface Topic {
  id: number;
  title: string;
  url: string;
  summary?: string;
  aliases?: string[];
}

interface TopicMatch {
  topic: Topic;
  startIndex: number;
  endIndex: number;
  matchedText: string;
}

interface AhoCorasickNode {
  children: Map<string, AhoCorasickNode>;
  fail: AhoCorasickNode | null;
  output: Topic[];
  depth: number;
}

class AhoCorasickMatcher {
  private root: AhoCorasickNode;
  private built: boolean = false;
  
  constructor() {
    this.root = this.createNode(0);
  }
  
  private createNode(depth: number): AhoCorasickNode {
    return {
      children: new Map(),
      fail: null,
      output: [],
      depth
    };
  }
  
  addPattern(pattern: string, topic: Topic): void {
    const normalizedPattern = pattern.toLowerCase();
    let node = this.root;
    
    for (const char of normalizedPattern) {
      if (!node.children.has(char)) {
        node.children.set(char, this.createNode(node.depth + 1));
      }
      node = node.children.get(char)!;
    }
    
    node.output.push(topic);
    this.built = false;
  }
  
  build(): void {
    if (this.built) return;
    
    const queue: AhoCorasickNode[] = [];
    
    for (const child of this.root.children.values()) {
      child.fail = this.root;
      queue.push(child);
    }
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      for (const [char, child] of current.children) {
        queue.push(child);
        
        let fail = current.fail;
        while (fail !== null && !fail.children.has(char)) {
          fail = fail.fail;
        }
        
        child.fail = fail ? fail.children.get(char)! : this.root;
        
        if (child.fail !== child) {
          child.output = [...child.output, ...child.fail.output];
        }
      }
    }
    
    this.built = true;
  }
  
  search(text: string): TopicMatch[] {
    if (!this.built) {
      this.build();
    }
    
    const normalizedText = text.toLowerCase();
    const matches: TopicMatch[] = [];
    let node = this.root;
    
    for (let i = 0; i < normalizedText.length; i++) {
      const char = normalizedText[i];
      
      while (node !== this.root && !node.children.has(char)) {
        node = node.fail!;
      }
      
      node = node.children.get(char) || this.root;
      
      for (const topic of node.output) {
        const patternLength = topic.title.length;
        const startIndex = i - patternLength + 1;
        const endIndex = i + 1;
        
        if (this.isWordBoundary(text, startIndex, endIndex)) {
          matches.push({
            topic,
            startIndex,
            endIndex,
            matchedText: text.substring(startIndex, endIndex)
          });
        }
      }
    }
    
    return this.filterOverlappingMatches(matches);
  }
  
  private isWordBoundary(text: string, start: number, end: number): boolean {
    const beforeChar = start > 0 ? text[start - 1] : ' ';
    const afterChar = end < text.length ? text[end] : ' ';
    
    const isWordChar = (c: string) => /[\w]/.test(c);
    
    return !isWordChar(beforeChar) && !isWordChar(afterChar);
  }
  
  private filterOverlappingMatches(matches: TopicMatch[]): TopicMatch[] {
    if (matches.length <= 1) return matches;
    
    matches.sort((a, b) => {
      if (a.startIndex !== b.startIndex) {
        return a.startIndex - b.startIndex;
      }
      return (b.endIndex - b.startIndex) - (a.endIndex - a.startIndex);
    });
    
    const filtered: TopicMatch[] = [];
    let lastEnd = -1;
    
    for (const match of matches) {
      if (match.startIndex >= lastEnd) {
        filtered.push(match);
        lastEnd = match.endIndex;
      } else if (match.endIndex - match.startIndex > lastEnd - filtered[filtered.length - 1].startIndex) {
        filtered[filtered.length - 1] = match;
        lastEnd = match.endIndex;
      }
    }
    
    return filtered;
  }
}

let matcher: AhoCorasickMatcher | null = null;

export async function initMatcher(): Promise<void> {
  matcher = new AhoCorasickMatcher();
  
  const topics = getAllTopics();
  
  for (const row of topics) {
    const topic = rowToTopic(row);
    
    matcher.addPattern(topic.title, topic);
    
    if (topic.aliases) {
      for (const alias of topic.aliases) {
        matcher.addPattern(alias, topic);
      }
    }
  }
  
  matcher.build();
  console.log(`[Matcher] Initialized with ${topics.length} topics`);
}

export function findMatches(text: string): TopicMatch[] {
  if (!matcher) {
    console.warn('[Matcher] Not initialized, returning empty matches');
    return [];
  }
  
  return matcher.search(text);
}

export function reloadMatcher(): void {
  matcher = null;
  initMatcher();
}

function rowToTopic(row: TopicRow): Topic {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    summary: row.summary || undefined,
    aliases: row.aliases ? JSON.parse(row.aliases) : undefined
  };
}

export type { TopicMatch, Topic };
