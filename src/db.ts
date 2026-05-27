/**
 * bun:sqlite instance — WAL mode for better concurrent read performance.
 *
 * Schema is created here; both tables are TRUNCATED on every startup so the
 * queue never survives a restart (matches original behaviour).
 */

import { Database } from "bun:sqlite";

const db = new Database("./db/tgvc.sqlite", { create: true });

// WAL mode — faster writes, non-blocking reads
db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA synchronous = NORMAL");

// ── Schema ────────────────────────────────────────────────────────────────────

db.run(`
  CREATE TABLE IF NOT EXISTS queue (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id    INTEGER NOT NULL,
    link       TEXT NOT NULL,
    title      TEXT NOT NULL,
    image      TEXT NOT NULL,
    artist     TEXT NOT NULL,
    duration   TEXT NOT NULL,
    req_by_id  INTEGER NOT NULL,
    req_by_fname TEXT NOT NULL,
    mp3_link   TEXT NOT NULL,
    provider   TEXT NOT NULL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS current (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id    INTEGER NOT NULL UNIQUE,
    link       TEXT NOT NULL,
    title      TEXT NOT NULL,
    image      TEXT NOT NULL,
    artist     TEXT NOT NULL,
    duration   TEXT NOT NULL,
    req_by_id  INTEGER NOT NULL,
    req_by_fname TEXT NOT NULL,
    mp3_link   TEXT NOT NULL,
    provider   TEXT NOT NULL
  )
`);

// Truncate on startup — queue never survives a restart
db.run("DELETE FROM queue");
db.run("DELETE FROM current");

export default db;
