import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
const dbPath = path.join(process.cwd(), 'data.db');
const first = !fs.existsSync(dbPath);
export const db = new Database(dbPath);
if (first){
    db.exec(`
    CREATE TABLE IF NOT EXISTS assets(
        id TEST PRIMARY KEY, owner TEXT, filename TEXT, originalPath TEXT, createdAt TEXT
    );
    CREATE TABLE IF NOT EXISTS jobs(
    id TEXT PRIMARY KEY, owner TEXT, assetId TEXT, status TEXT,
    startedAt TEXT, finishedAt TEXT, outputsJson TEXT, iterations INTEGER, variants INTEGER
    );`);
}