import { Router } from 'express';
import { 
  startScheduler, 
  stopScheduler, 
  getSchedulerStatus, 
  triggerCrawl,
  seedAllPopularTopics 
} from '../crawler/scheduler.js';
import {
  startParallelSeeding,
  stopParallelSeeding,
  getParallelSeedingStatus
} from '../crawler/parallelCrawler.js';
import {
  getDiscoveryQueueSize,
  clearDiscoveryQueue
} from '../crawler/crawlerWrapper.js';

const router = Router();

/**
 * Get scheduler status
 * GET /api/scheduler/status
 */
router.get('/scheduler/status', (req, res) => {
  const status = getSchedulerStatus();
  res.json(status);
});

/**
 * Start the automatic scheduler
 * POST /api/scheduler/start
 * Body: { intervalMinutes?: number, batchSize?: number }
 */
router.post('/scheduler/start', (req, res) => {
  const { intervalMinutes = 60, batchSize = 20 } = req.body;
  
  startScheduler({
    intervalMs: intervalMinutes * 60 * 1000,
    batchSize
  });
  
  res.json({ 
    success: true, 
    message: `Scheduler started with ${intervalMinutes} minute interval, batch size ${batchSize}` 
  });
});

/**
 * Stop the automatic scheduler
 * POST /api/scheduler/stop
 */
router.post('/scheduler/stop', (req, res) => {
  stopScheduler();
  res.json({ success: true, message: 'Scheduler stopped' });
});

/**
 * Manually trigger a crawl batch
 * POST /api/scheduler/trigger
 * Body: { batchSize?: number }
 */
router.post('/scheduler/trigger', async (req, res) => {
  try {
    const { batchSize } = req.body;
    await triggerCrawl(batchSize);
    res.json({ success: true, message: 'Crawl batch triggered' });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * Seed all popular topics (bulk crawl)
 * POST /api/scheduler/seed
 * Warning: This can take a while (~2-3 minutes for 100+ topics)
 */
router.post('/scheduler/seed', async (req, res) => {
  try {
    res.json({ 
      success: true, 
      message: 'Seeding started in background. Check /api/scheduler/status for progress.' 
    });
    
    // Run in background (don't await)
    seedAllPopularTopics().then(result => {
      console.log('[Scheduler API] Seeding complete:', result);
    }).catch(error => {
      console.error('[Scheduler API] Seeding error:', error);
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * Start parallel seeding with Wikipedia topics
 * POST /api/scheduler/seed-parallel
 * Body: { workers?: number, maxTopics?: number }
 */
router.post('/scheduler/seed-parallel', async (req, res) => {
  try {
    const { workers = 20, maxTopics } = req.body;
    
    // Check if already running
    const currentStatus = getParallelSeedingStatus();
    if (currentStatus.isRunning) {
      return res.status(400).json({ 
        error: 'Parallel seeding is already running',
        status: currentStatus
      });
    }
    
    res.json({ 
      success: true, 
      message: `Parallel seeding started with ${workers} workers${maxTopics ? `, max ${maxTopics} topics` : ''}. Check /api/scheduler/parallel-status for progress.`
    });
    
    // Run in background (don't await)
    startParallelSeeding(workers, maxTopics).then(() => {
      console.log('[Scheduler API] Parallel seeding complete');
      // After parallel seeding completes, start the regular scheduler
      startScheduler({ intervalMs: 60 * 60 * 1000, batchSize: 20 });
    }).catch(error => {
      console.error('[Scheduler API] Parallel seeding error:', error);
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * Stop parallel seeding
 * POST /api/scheduler/stop-parallel
 */
router.post('/scheduler/stop-parallel', (req, res) => {
  stopParallelSeeding();
  res.json({ success: true, message: 'Parallel seeding stopped' });
});

/**
 * Get parallel seeding status
 * GET /api/scheduler/parallel-status
 */
router.get('/scheduler/parallel-status', (req, res) => {
  const status = getParallelSeedingStatus();
  res.json(status);
});

/**
 * Debug endpoint - inspect discovery queue contents
 * GET /api/scheduler/debug-queue
 */
router.get('/scheduler/debug-queue', (req, res) => {
  const size = getDiscoveryQueueSize();
  res.json({
    queueSize: size,
    status: size === 0 ? 'empty' : size < 100 ? 'normal' : 'large'
  });
});

/**
 * Reset discovery queue - clear all pending crawls
 * POST /api/scheduler/reset-queue
 * WARNING: This clears all discovered topics pending crawl
 */
router.post('/scheduler/reset-queue', (req, res) => {
  const oldSize = getDiscoveryQueueSize();
  clearDiscoveryQueue();
  res.json({ 
    success: true, 
    message: 'Discovery queue cleared',
    previousSize: oldSize,
    newSize: 0
  });
});

export { router as schedulerRoutes };
