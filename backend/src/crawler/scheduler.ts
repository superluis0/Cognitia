import { crawlAndSave, getDiscoveryQueueSize, popFromDiscoveryQueue } from './crawlerWrapper.js';
import { getAllTopicUrls, POPULAR_TOPICS, getTopicUrl } from './popularTopics.js';
import { getTopicCount } from '../index/database.js';
import { reloadMatcher } from '../matching/matcher.js';

interface SchedulerConfig {
  intervalMs: number;         // How often to run the crawler
  batchSize: number;          // How many pages to crawl per run
  delayBetweenPages: number;  // Delay between individual page crawls (ms)
}

const DEFAULT_CONFIG: SchedulerConfig = {
  intervalMs: 60 * 60 * 1000,    // Every hour
  batchSize: 20,                  // 20 pages per run
  delayBetweenPages: 2000,        // 2 seconds between pages (polite crawling)
};

let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let isRunning = false;
let crawlIndex = 0;

/**
 * Crawl a batch of topics from the popular topics list AND discovery queue
 */
async function crawlBatch(config: SchedulerConfig): Promise<void> {
  if (isRunning) {
    console.log('[Scheduler] Crawl already in progress, skipping...');
    return;
  }
  
  isRunning = true;
  const batch: string[] = [];
  
  // First, add topics from discovery queue (these are links found in other pages)
  const discoveryQueueSize = getDiscoveryQueueSize();
  const discoveryBatchSize = Math.min(Math.floor(config.batchSize / 2), discoveryQueueSize);
  
  for (let i = 0; i < discoveryBatchSize; i++) {
    const topic = popFromDiscoveryQueue();
    if (topic) {
      batch.push(getTopicUrl(topic));
    }
  }
  
  // Fill the rest with popular topics
  const urls = getAllTopicUrls();
  const remainingSlots = config.batchSize - batch.length;
  const startIndex = crawlIndex % urls.length;
  
  for (let i = 0; i < remainingSlots; i++) {
    const idx = (startIndex + i) % urls.length;
    batch.push(urls[idx]);
  }
  
  console.log(`[Scheduler] Starting batch crawl: ${batch.length} pages (${discoveryBatchSize} discovered, ${batch.length - discoveryBatchSize} popular)`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const url of batch) {
    try {
      await crawlAndSave(url);
      successCount++;
    } catch (error) {
      console.error(`[Scheduler] Failed to crawl ${url}:`, error);
      errorCount++;
    }
    
    // Polite delay between requests
    await new Promise(resolve => setTimeout(resolve, config.delayBetweenPages));
  }
  
  // Update index for next batch (only count the popular topics portion)
  crawlIndex = (startIndex + (config.batchSize - discoveryBatchSize)) % urls.length;
  
  // Reload matcher with new topics
  reloadMatcher();
  
  const totalTopics = getTopicCount();
  const remainingDiscovery = getDiscoveryQueueSize();
  console.log(`[Scheduler] Batch complete: ${successCount} success, ${errorCount} errors. Total topics: ${totalTopics}. Discovery queue: ${remainingDiscovery}`);
  
  isRunning = false;
}

/**
 * Start the automatic crawler scheduler
 */
export function startScheduler(config: Partial<SchedulerConfig> = {}): void {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  if (schedulerInterval) {
    console.log('[Scheduler] Already running, stopping first...');
    stopScheduler();
  }
  
  console.log(`[Scheduler] Starting with interval ${finalConfig.intervalMs / 1000}s, batch size ${finalConfig.batchSize}`);
  
  // Run immediately on start
  crawlBatch(finalConfig);
  
  // Schedule recurring crawls
  schedulerInterval = setInterval(() => {
    crawlBatch(finalConfig);
  }, finalConfig.intervalMs);
}

/**
 * Stop the automatic crawler scheduler
 */
export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Scheduler] Stopped');
  }
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus(): {
  running: boolean;
  currentIndex: number;
  totalPopularTopics: number;
  discoveryQueueSize: number;
  dbTopicCount: number;
} {
  return {
    running: schedulerInterval !== null,
    currentIndex: crawlIndex,
    totalPopularTopics: POPULAR_TOPICS.length,
    discoveryQueueSize: getDiscoveryQueueSize(),
    dbTopicCount: getTopicCount()
  };
}

/**
 * Manually trigger a crawl batch
 */
export async function triggerCrawl(batchSize?: number): Promise<void> {
  const config = { ...DEFAULT_CONFIG };
  if (batchSize) {
    config.batchSize = batchSize;
  }
  await crawlBatch(config);
}

/**
 * Seed all popular topics (initial bulk crawl)
 */
export async function seedAllPopularTopics(): Promise<{ success: number; errors: number }> {
  const urls = getAllTopicUrls();
  console.log(`[Scheduler] Seeding all ${urls.length} popular topics...`);
  
  let success = 0;
  let errors = 0;
  
  for (const url of urls) {
    try {
      await crawlAndSave(url);
      success++;
      console.log(`[Scheduler] Progress: ${success + errors}/${urls.length}`);
    } catch (error) {
      errors++;
      console.error(`[Scheduler] Failed: ${url}`);
    }
    
    // 1.5 second delay to be polite
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  reloadMatcher();
  console.log(`[Scheduler] Seeding complete: ${success} success, ${errors} errors`);
  
  return { success, errors };
}
