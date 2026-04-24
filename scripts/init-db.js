const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

function main() {
  console.log('Starting SQLite database initialization...');

  const dataDir = path.join(process.cwd(), '.data');
  if (!fs.existsSync(dataDir)) {
    console.log('Creating .data directory...');
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = process.env.DATABASE_URL || path.join(dataDir, 'copyit.db');
  console.log(`Connecting to SQLite at: ${dbPath}`);

  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Failed to connect to SQLite', err);
      process.exit(1);
    }
  });

  db.serialize(() => {
    db.run('PRAGMA journal_mode = WAL');

    db.run(`
      CREATE TABLE IF NOT EXISTS snippets (
        id TEXT PRIMARY KEY,
        path TEXT UNIQUE NOT NULL,
        content TEXT NOT NULL,
        ttl_seconds INTEGER NOT NULL,
        is_one_time BOOLEAN DEFAULT FALSE,
        is_consumed BOOLEAN DEFAULT FALSE,
        secret_hash TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL
      );
    `);

    db.run(`ALTER TABLE snippets ADD COLUMN secret_hash TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Migration warning:', err.message);
      }
    });

    db.run(`CREATE INDEX IF NOT EXISTS snippets_path_idx ON snippets(path);`);
    db.run(`CREATE INDEX IF NOT EXISTS snippets_expires_at_idx ON snippets(expires_at);`);
  });

  db.close((err) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log('SQLite database initialized successfully.');
    }
  });
}

main();
