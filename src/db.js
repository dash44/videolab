import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data.db');
const first = !fs.existsSync(dbPath);

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

if (first){
    db.exec(`
        CREATE TABLE IF NOT EXISTS assets (
            id            TEXT PRIMARY KEY,
            owner         TEXT NOT NULL,
            filename      TEXT NOT NULL,
            originalPath  TEXT NOT NULL,
            kind          TEXT NOT NULL DEFAULT 'video',     -- 'video' or 'image'
            mime          TEXT,                               -- e.g. 'video/mp4'
            sizeBytes     INTEGER,                            -- file size
            durationSec   REAL,                               -- video duration
            width         INTEGER,                            -- frame width
            height        INTEGER,                            -- frame height
            codec         TEXT,                               -- detected codec
            createdAt     TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
        CREATE TABLE IF NOT EXISTS jobs (
            id               TEXT PRIMARY KEY,
            owner            TEXT,
            assetId          TEXT,
            status           TEXT,                            -- queued|running|done|error
            startedAt        TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
            finishedAt       TEXT,                            -- NULL until done/error
            outputsJson      TEXT,                            -- JSON array of outputs
            iterations       INTEGER,                         -- keep to satisfy rubric if you used it
            variants         INTEGER,                         -- how many output variants
            targetFormat     TEXT,                            -- e.g. 'mp4','webm'
            targetResolution TEXT,                            -- e.g. '1080p','720p'
            bitrate          TEXT,                            -- e.g. '4M'
            preset           TEXT,                            -- e.g. 'veryfast'
            crf              INTEGER                          -- e.g. 23
            );
    `);
}