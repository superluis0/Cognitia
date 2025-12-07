import { getDatabase, updateTopicUrl } from '../index/database.js';

/**
 * Fix incorrectly capitalized Grokipedia URLs in the database
 * Fixes known issues like Artificial_Intelligence → Artificial_intelligence
 */
export function fixGrokipediaUrls(): void {
  try {
    console.log('[FixUrls] Starting URL migration...');
    
    const incorrectUrlMappings: Record<string, string> = {
      'https://grokipedia.com/page/Artificial_Intelligence': 'https://grokipedia.com/page/Artificial_intelligence',
    };
    
    const db = getDatabase();
    
    let fixed = 0;
    for (const [incorrectUrl, correctUrl] of Object.entries(incorrectUrlMappings)) {
      if (incorrectUrl === correctUrl) continue; // Skip if no change
      
      // Find topics with incorrect URLs
      const stmt = db.prepare('SELECT id, title FROM topics WHERE url = ?');
      const topics = stmt.all(incorrectUrl) as Array<{id: number; title: string}>;
      
      if (topics.length > 0) {
        topics.forEach(topic => {
          updateTopicUrl(topic.title, correctUrl);
          console.log(`[FixUrls] Fixed: ${topic.title}: ${incorrectUrl} → ${correctUrl}`);
          fixed++;
        });
      }
    }
    
    console.log(`[FixUrls] Migration complete. Fixed ${fixed} topics.`);
  } catch (error) {
    console.error('[FixUrls] Error during migration:', error);
    throw error;
  }
}
