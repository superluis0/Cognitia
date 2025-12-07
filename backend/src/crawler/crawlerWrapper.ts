import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { insertTopic, getTopicByTitle } from '../index/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CRAWLER_PATH = path.join(__dirname, 'grokipedia-crawler.py');

interface CrawlResult {
  title: string;
  url: string;
  content: string;
  summary: string;
}

/**
 * Crawl a Grokipedia page and extract its content
 */
export async function crawlPage(url: string): Promise<CrawlResult> {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', [CRAWLER_PATH, url, '--markdown']);
    
    let stdout = '';
    let stderr = '';
    
    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Crawler exited with code ${code}: ${stderr}`));
        return;
      }
      
      const content = stdout.trim();
      if (!content) {
        reject(new Error('No content extracted from page'));
        return;
      }
      
      // Extract title from first markdown header
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : extractTitleFromUrl(url);
      
      // Generate summary from first paragraph (after title)
      const summary = extractSummary(content);
      
      resolve({
        title,
        url,
        content,
        summary
      });
    });
    
    python.on('error', (err) => {
      reject(new Error(`Failed to spawn crawler: ${err.message}`));
    });
  });
}

/**
 * Crawl a page and save it to the database
 */
export async function crawlAndSave(url: string): Promise<number> {
  const result = await crawlPage(url);
  
  // Check if topic already exists
  const existing = getTopicByTitle(result.title);
  if (existing) {
    console.log(`[Crawler] Topic "${result.title}" already exists, updating...`);
  }
  
  const id = insertTopic(result.title, result.url, result.summary);
  console.log(`[Crawler] Saved topic: ${result.title} (id: ${id})`);
  
  return id;
}

/**
 * Crawl multiple pages
 */
export async function crawlPages(urls: string[]): Promise<Array<{ url: string; success: boolean; error?: string }>> {
  const results: Array<{ url: string; success: boolean; error?: string }> = [];
  
  for (const url of urls) {
    try {
      await crawlAndSave(url);
      results.push({ url, success: true });
    } catch (error) {
      results.push({ url, success: false, error: String(error) });
    }
    
    // Small delay between requests to be polite
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}

function extractTitleFromUrl(url: string): string {
  const match = url.match(/\/page\/(.+)$/);
  if (match) {
    return decodeURIComponent(match[1].replace(/_/g, ' '));
  }
  return 'Unknown Topic';
}

function extractSummary(content: string): string {
  // Remove the title line
  const lines = content.split('\n');
  const contentWithoutTitle = lines.slice(1).join('\n').trim();
  
  // Find the first paragraph (non-empty line that's not a header)
  const paragraphs = contentWithoutTitle.split(/\n\n+/);
  
  for (const para of paragraphs) {
    const trimmed = para.trim();
    // Skip headers, lists, and short lines
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-') && !trimmed.startsWith('*') && trimmed.length > 50) {
      // Truncate to ~300 chars at word boundary
      if (trimmed.length > 300) {
        const truncated = trimmed.substring(0, 300);
        const lastSpace = truncated.lastIndexOf(' ');
        return truncated.substring(0, lastSpace) + '...';
      }
      return trimmed;
    }
  }
  
  // Fallback: just take first 300 chars
  const fallback = contentWithoutTitle.substring(0, 300);
  const lastSpace = fallback.lastIndexOf(' ');
  return fallback.substring(0, lastSpace) + '...';
}
