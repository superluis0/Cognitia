import { Router } from 'express';
import { crawlPage, crawlAndSave, crawlPages } from '../crawler/crawlerWrapper.js';
import { reloadMatcher } from '../matching/matcher.js';

const router = Router();

/**
 * Crawl a single Grokipedia page
 * POST /api/crawl
 * Body: { url: string, save?: boolean }
 */
router.post('/crawl', async (req, res) => {
  try {
    const { url, save = true } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }
    
    if (!url.includes('grokipedia.com')) {
      return res.status(400).json({ error: 'URL must be from grokipedia.com' });
    }
    
    if (save) {
      const id = await crawlAndSave(url);
      // Reload the matcher to include the new topic
      reloadMatcher();
      res.json({ success: true, id });
    } else {
      const result = await crawlPage(url);
      res.json({ success: true, ...result });
    }
  } catch (error) {
    console.error('[Crawl API] Error:', error);
    res.status(500).json({ error: String(error) });
  }
});

/**
 * Crawl multiple Grokipedia pages
 * POST /api/crawl/batch
 * Body: { urls: string[] }
 */
router.post('/crawl/batch', async (req, res) => {
  try {
    const { urls } = req.body;
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'urls array is required' });
    }
    
    if (urls.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 URLs per batch' });
    }
    
    const results = await crawlPages(urls);
    
    // Reload the matcher after batch crawl
    reloadMatcher();
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    res.json({
      success: true,
      summary: { total: urls.length, successful, failed },
      results
    });
  } catch (error) {
    console.error('[Crawl API] Batch error:', error);
    res.status(500).json({ error: String(error) });
  }
});

export { router as crawlRoutes };
