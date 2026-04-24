import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export function hashSecret(secret: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(secret, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

export function verifySecret(secret: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(':');
    const derived = crypto.scryptSync(secret, salt, 32).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

const globalForDb = global as unknown as { sqliteDb: sqlite3.Database };

let db: sqlite3.Database;

if (globalForDb.sqliteDb) {
  db = globalForDb.sqliteDb;
} else {
  const dataDir = path.join(process.cwd(), '.data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = process.env.DATABASE_URL || path.join(dataDir, 'copyit.db');

  // Enable verbose mode in development
  if (process.env.NODE_ENV === 'development') {
    sqlite3.verbose();
  }

  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Failed to open sqlite3 database', err);
    }
  });

  // Basic PRAGMA configuration for speed
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA synchronous = NORMAL');
  db.run('PRAGMA temp_store = MEMORY');

  // Safe migration: add secret_hash if not present
  db.run(`ALTER TABLE snippets ADD COLUMN secret_hash TEXT`, (err) => {
    if (err && err.message && !err.message.includes('duplicate column')) {
      console.error('DB migration error:', err.message);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForDb.sqliteDb = db;
  }
}

// Promisified query helper to replace Postgres `await pool.query()`
export async function query(text: string, params: unknown[] = []): Promise<unknown> {
  return new Promise((resolve, reject) => {
    // If it's an insert/update/delete, use run() to get the ID/changes
    if (text.trim().toUpperCase().startsWith('SELECT')) {
      db.all(text, params, (err, rows) => {
        if (err) reject(err);
        else {
          // Emulate Postgres structure { rows: [...] }
          resolve({ rows: rows || [] });
        }
      });
    } else {
      db.run(text, params, function (err) {
        if (err) reject(err);
        // Emulate PG response with rowCount
        else resolve({ rowCount: this.changes, lastID: this.lastID });
      });
    }
  });
}

export function getDb() {
  return db;
}
