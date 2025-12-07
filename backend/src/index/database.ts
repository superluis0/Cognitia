import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: Database.Database | null = null;

export interface TopicRow {
  id: number;
  title: string;
  url: string;
  summary: string | null;
  aliases: string | null;
  created_at: string;
  updated_at: string;
}

export async function initDatabase(): Promise<Database.Database> {
  if (db) {
    return db;
  }
  
  const dbPath = path.join(__dirname, '../../data/topics.db');
  
  db = new Database(dbPath);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT UNIQUE NOT NULL,
      summary TEXT,
      aliases TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_topics_title ON topics(title);
    
    CREATE VIRTUAL TABLE IF NOT EXISTS topics_fts USING fts5(
      title,
      aliases,
      content=topics,
      content_rowid=id
    );
    
    CREATE TRIGGER IF NOT EXISTS topics_ai AFTER INSERT ON topics BEGIN
      INSERT INTO topics_fts(rowid, title, aliases)
      VALUES (NEW.id, NEW.title, NEW.aliases);
    END;
    
    CREATE TRIGGER IF NOT EXISTS topics_ad AFTER DELETE ON topics BEGIN
      INSERT INTO topics_fts(topics_fts, rowid, title, aliases)
      VALUES ('delete', OLD.id, OLD.title, OLD.aliases);
    END;
    
    CREATE TRIGGER IF NOT EXISTS topics_au AFTER UPDATE ON topics BEGIN
      INSERT INTO topics_fts(topics_fts, rowid, title, aliases)
      VALUES ('delete', OLD.id, OLD.title, OLD.aliases);
      INSERT INTO topics_fts(rowid, title, aliases)
      VALUES (NEW.id, NEW.title, NEW.aliases);
    END;
  `);
  
  console.log('[Database] SQLite database initialized');
  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function insertTopic(
  title: string,
  url: string,
  summary?: string,
  aliases?: string[]
): number {
  const database = getDatabase();
  
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO topics (title, url, summary, aliases, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  
  const result = stmt.run(
    title,
    url,
    summary || null,
    aliases ? JSON.stringify(aliases) : null
  );
  
  return Number(result.lastInsertRowid);
}

export function getAllTopics(): TopicRow[] {
  const database = getDatabase();
  const stmt = database.prepare('SELECT * FROM topics ORDER BY title');
  return stmt.all() as TopicRow[];
}

export function searchTopics(query: string): TopicRow[] {
  const database = getDatabase();
  
  const stmt = database.prepare(`
    SELECT topics.*
    FROM topics_fts
    JOIN topics ON topics_fts.rowid = topics.id
    WHERE topics_fts MATCH ?
    ORDER BY rank
    LIMIT 50
  `);
  
  return stmt.all(query) as TopicRow[];
}

export function getTopicByTitle(title: string): TopicRow | undefined {
  const database = getDatabase();
  const stmt = database.prepare('SELECT * FROM topics WHERE title = ?');
  return stmt.get(title) as TopicRow | undefined;
}

export function getTopicById(id: number): TopicRow | undefined {
  const database = getDatabase();
  const stmt = database.prepare('SELECT * FROM topics WHERE id = ?');
  return stmt.get(id) as TopicRow | undefined;
}

export function getTopicCount(): number {
  const database = getDatabase();
  const stmt = database.prepare('SELECT COUNT(*) as count FROM topics');
  const result = stmt.get() as { count: number };
  return result.count;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
