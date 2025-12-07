import { Router } from 'express';
import { extractClaimsAndTopics, verdictWithGrokipediaContext, verdictWithOwnKnowledge } from '../grok/client.js';
import { crawlPage } from '../crawler/crawlerWrapper.js';

const router = Router();

const GROKIPEDIA_BASE = 'https://grokipedia.com/page/';

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

interface FactCheckResponse {
  tweetText: string;
  claims: ClaimResult[];
  analyzedAt: string;
}

function toGrokipediaSlug(topic: string): string {
  return topic
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w\-_.]/g, '');
}

// Generate slug variations to try (e.g., "Tesla, Inc." -> ["Tesla,_Inc.", "Tesla", "Tesla_Inc"])
function generateSlugVariations(topic: string): string[] {
  const variations: string[] = [];
  
  // Original slug
  const original = toGrokipediaSlug(topic);
  variations.push(original);
  
  // Without suffix like ", Inc.", ", LLC", etc.
  const withoutSuffix = topic.replace(/,?\s*(Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Company|Co\.?)$/i, '').trim();
  if (withoutSuffix !== topic) {
    variations.push(toGrokipediaSlug(withoutSuffix));
  }
  
  // Without parenthetical disambiguators like "(company)" or "(band)"
  const withoutParens = topic.replace(/\s*\([^)]+\)\s*$/, '').trim();
  if (withoutParens !== topic) {
    variations.push(toGrokipediaSlug(withoutParens));
  }
  
  // Just the first word for compound names
  const firstWord = topic.split(/[\s,]/)[0];
  if (firstWord && firstWord.length > 2 && firstWord !== topic) {
    variations.push(toGrokipediaSlug(firstWord));
  }
  
  // Remove duplicates
  return [...new Set(variations)];
}

async function checkGrokipediaPageExists(slug: string): Promise<boolean> {
  const url = `${GROKIPEDIA_BASE}${encodeURIComponent(slug)}`;
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Cognitia/1.0 (Fact-Checker)',
      },
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) return false;
    
    const text = await response.text();
    // Grokipedia returns 200 even for non-existent pages
    return text.includes('__next') && !text.includes('Page not found') && text.length > 5000;
  } catch (error) {
    console.error(`[FactCheck] Error checking page ${slug}:`, error);
    return false;
  }
}

// Try multiple slug variations to find a valid Grokipedia page
async function findGrokipediaPage(topic: string): Promise<{ exists: boolean; slug: string }> {
  const variations = generateSlugVariations(topic);
  
  for (const slug of variations) {
    console.log(`[FactCheck] Trying slug variation: ${slug}`);
    const exists = await checkGrokipediaPageExists(slug);
    if (exists) {
      console.log(`[FactCheck] Found Grokipedia page at: ${slug}`);
      return { exists: true, slug };
    }
  }
  
  return { exists: false, slug: variations[0] };
}

async function getGrokipediaContent(slug: string): Promise<string | null> {
  try {
    const url = `${GROKIPEDIA_BASE}${encodeURIComponent(slug)}`;
    const result = await crawlPage(url);
    return result.content;
  } catch (error) {
    console.error(`[FactCheck] Error crawling ${slug}:`, error);
    return null;
  }
}

router.post('/fact-check', async (req, res) => {
  try {
    const { tweetText } = req.body;
    
    if (!tweetText || typeof tweetText !== 'string') {
      return res.status(400).json({ error: 'tweetText is required' });
    }
    
    console.log(`[FactCheck] Analyzing tweet: "${tweetText.substring(0, 100)}..."`);
    
    // Step 1: Extract claims and topics using Grok
    const claimsData = await extractClaimsAndTopics(tweetText);
    
    if (!claimsData.claims || claimsData.claims.length === 0) {
      return res.json({
        tweetText,
        claims: [],
        analyzedAt: new Date().toISOString(),
        message: 'No verifiable claims found in this tweet.'
      });
    }
    
    console.log(`[FactCheck] Found ${claimsData.claims.length} claims`);
    
    const results: ClaimResult[] = [];
    
    // Step 2: For each claim, try to find relevant Grokipedia content
    for (const claim of claimsData.claims) {
      console.log(`[FactCheck] Checking claim about "${claim.topic}"`);
      
      // Try to find a Grokipedia page with slug variations
      const { exists: pageExists, slug: foundSlug } = await findGrokipediaPage(claim.topic);
      
      let grokipediaContent: string | null = null;
      let grokipediaUrl: string | null = null;
      
      if (pageExists) {
        console.log(`[FactCheck] Grokipedia page exists at ${foundSlug}, crawling...`);
        grokipediaContent = await getGrokipediaContent(foundSlug);
        grokipediaUrl = `${GROKIPEDIA_BASE}${foundSlug}`;
      }
      
      // Always use Grok to verdict, but incorporate Grokipedia content if available
      if (grokipediaContent) {
        const verdict = await verdictWithGrokipediaContext(claim.text, claim.topic, grokipediaContent);
        
        results.push({
          claim: claim.text,
          topic: claim.topic,
          verdict: verdict.verdict,
          explanation: verdict.explanation,
          source: {
            type: 'grokipedia',
            topic: claim.topic,
            url: grokipediaUrl!
          }
        });
      } else {
        // No Grokipedia content available, use Grok's own knowledge
        console.log(`[FactCheck] No Grokipedia page found for "${claim.topic}", using Grok's knowledge`);
        const verdict = await verdictWithOwnKnowledge(claim.text, claim.topic);
        
        results.push({
          claim: claim.text,
          topic: claim.topic,
          verdict: verdict.verdict,
          explanation: verdict.explanation,
          source: {
            type: 'grok',
            note: `Verified using Grok's knowledge`
          }
        });
      }
    }
    
    const response: FactCheckResponse = {
      tweetText,
      claims: results,
      analyzedAt: new Date().toISOString()
    };
    
    console.log(`[FactCheck] Completed analysis with ${results.length} verdicts`);
    res.json(response);
    
  } catch (error) {
    console.error('[FactCheck] Error:', error);
    res.status(500).json({ error: String(error) });
  }
});

export { router as factCheckRoutes };
