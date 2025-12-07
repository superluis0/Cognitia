import { crawlAndSave } from './crawlerWrapper.js';
import { getTopicByTitle } from '../index/database.js';
import { getAllTopics, getGrokipediaUrl, toGrokipediaSlug } from './wikipediaTopics.js';

const GROKIPEDIA_BASE = 'https://grokipedia.com/page/';

interface ParallelCrawlerStatus {
  isRunning: boolean;
  totalTopics: number;
  checked: number;
  found: number;
  saved: number;
  skipped: number;
  errors: number;
  startTime: number | null;
  endTime: number | null;
  currentBatch: string[];
  recentErrors: string[];
}

let status: ParallelCrawlerStatus = {
  isRunning: false,
  totalTopics: 0,
  checked: 0,
  found: 0,
  saved: 0,
  skipped: 0,
  errors: 0,
  startTime: null,
  endTime: null,
  currentBatch: [],
  recentErrors: [],
};

/**
 * Check if a Grokipedia page exists using HEAD request
 */
async function checkPageExists(topic: string): Promise<boolean> {
  const url = `${GROKIPEDIA_BASE}${encodeURIComponent(topic)}`;
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Cognitia/1.0 (Educational Topic Crawler)',
      },
    });
    
    clearTimeout(timeout);
    
    // Grokipedia returns 200 even for non-existent pages, so we need to check with GET
    if (response.ok) {
      // Do a quick GET to verify content exists
      const getResponse = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Cognitia/1.0 (Educational Topic Crawler)',
        },
      });
      
      if (!getResponse.ok) return false;
      
      const text = await getResponse.text();
      // Check if the page has actual content (not a 404 page)
      return text.includes('__next') && !text.includes('Page not found') && text.length > 5000;
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Process a single topic: check if exists, then crawl and save
 */
async function processTopic(topic: string): Promise<'saved' | 'skipped' | 'exists' | 'error'> {
  const cleanTopic = toGrokipediaSlug(topic);
  
  // Check if already in database
  const existing = getTopicByTitle(cleanTopic.replace(/_/g, ' '));
  if (existing) {
    return 'exists';
  }
  
  // Check if page exists on Grokipedia
  const exists = await checkPageExists(cleanTopic);
  if (!exists) {
    return 'skipped';
  }
  
  // Crawl and save
  try {
    const url = getGrokipediaUrl(cleanTopic);
    await crawlAndSave(url);
    return 'saved';
  } catch (error) {
    const errorMsg = `${cleanTopic}: ${error}`;
    status.recentErrors.push(errorMsg);
    if (status.recentErrors.length > 10) {
      status.recentErrors.shift();
    }
    return 'error';
  }
}

/**
 * Process topics in parallel with a worker pool
 */
async function processWithWorkerPool(
  topics: string[],
  workerCount: number = 20,
  delayMs: number = 100
): Promise<void> {
  let index = 0;
  const total = topics.length;
  
  async function worker(workerId: number): Promise<void> {
    while (index < total && status.isRunning) {
      const currentIndex = index++;
      const topic = topics[currentIndex];
      
      status.currentBatch[workerId] = topic;
      
      try {
        const result = await processTopic(topic);
        
        status.checked++;
        
        switch (result) {
          case 'saved':
            status.found++;
            status.saved++;
            console.log(`[Worker ${workerId}] Saved: ${topic}`);
            break;
          case 'exists':
            status.found++;
            status.skipped++;
            break;
          case 'skipped':
            // Page doesn't exist on Grokipedia
            break;
          case 'error':
            status.errors++;
            break;
        }
      } catch (error) {
        status.checked++;
        status.errors++;
      }
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    status.currentBatch[workerId] = '';
  }
  
  // Create worker pool
  const workers: Promise<void>[] = [];
  for (let i = 0; i < workerCount; i++) {
    // Stagger worker starts to avoid initial burst
    await new Promise(resolve => setTimeout(resolve, 50));
    workers.push(worker(i));
  }
  
  // Wait for all workers to finish
  await Promise.all(workers);
}

/**
 * Start parallel seeding with Wikipedia topics
 */
export async function startParallelSeeding(
  workerCount: number = 20,
  maxTopics?: number
): Promise<void> {
  if (status.isRunning) {
    throw new Error('Parallel seeding is already running');
  }
  
  // Get all topics
  let topics = getAllTopics();
  
  // Limit if specified
  if (maxTopics && maxTopics < topics.length) {
    topics = topics.slice(0, maxTopics);
  }
  
  // Reset status
  status = {
    isRunning: true,
    totalTopics: topics.length,
    checked: 0,
    found: 0,
    saved: 0,
    skipped: 0,
    errors: 0,
    startTime: Date.now(),
    endTime: null,
    currentBatch: new Array(workerCount).fill(''),
    recentErrors: [],
  };
  
  console.log(`[ParallelCrawler] Starting with ${topics.length} topics, ${workerCount} workers`);
  
  try {
    await processWithWorkerPool(topics, workerCount, 100);
  } finally {
    status.isRunning = false;
    status.endTime = Date.now();
    
    const duration = (status.endTime - status.startTime!) / 1000;
    console.log(`[ParallelCrawler] Completed in ${duration.toFixed(1)}s`);
    console.log(`[ParallelCrawler] Checked: ${status.checked}, Found: ${status.found}, Saved: ${status.saved}, Errors: ${status.errors}`);
  }
}

/**
 * Stop parallel seeding
 */
export function stopParallelSeeding(): void {
  status.isRunning = false;
}

/**
 * Get current status of parallel seeding
 */
export function getParallelSeedingStatus(): ParallelCrawlerStatus & { 
  elapsedSeconds: number;
  estimatedRemainingSeconds: number;
  topicsPerSecond: number;
} {
  const now = Date.now();
  const elapsedMs = status.startTime ? (status.endTime || now) - status.startTime : 0;
  const elapsedSeconds = elapsedMs / 1000;
  
  const topicsPerSecond = elapsedSeconds > 0 ? status.checked / elapsedSeconds : 0;
  const remaining = status.totalTopics - status.checked;
  const estimatedRemainingSeconds = topicsPerSecond > 0 ? remaining / topicsPerSecond : 0;
  
  return {
    ...status,
    elapsedSeconds,
    estimatedRemainingSeconds,
    topicsPerSecond,
  };
}
