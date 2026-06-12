/**
 * Queue — fully synchronous (bun:sqlite is always sync).
 *
 * Two tables:
 *   queue   — upcoming tracks per chat (FIFO, multiple rows per chat_id)
 *   current — currently playing track per chat (max one row per chat_id)
 *
 * All statements are prepared once at module load for maximum performance.
 */

import db from "./db";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QueueData {
  link: string;
  title: string;
  image: string;
  artist: string;
  duration: string;
  requestedBy: {
    id: number;
    first_name: string;
  };
  mp3_link: string;
  provider: "jiosaavn" | "youtube" | "telegram" | "radio";
  /** Stream the video track into the VC too (YouTube only). */
  video?: boolean;
}

/** A queued track paired with its stable database row id. */
export type QueueItem = QueueData & { id: number };

/** Shape of a row coming back from SQLite */
interface DbRow {
  id: number;
  chat_id: number;
  link: string;
  title: string;
  image: string;
  artist: string;
  duration: string;
  req_by_id: number;
  req_by_fname: string;
  mp3_link: string;
  provider: "jiosaavn" | "youtube" | "telegram" | "radio";
  video: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowToQueueData(row: DbRow): QueueData {
  return {
    link: row.link,
    title: row.title,
    image: row.image,
    artist: row.artist,
    duration: row.duration,
    requestedBy: { id: row.req_by_id, first_name: row.req_by_fname },
    mp3_link: row.mp3_link,
    provider: row.provider,
    video: !!row.video,
  };
}

function rowToQueueItem(row: DbRow): QueueItem {
  return { id: row.id, ...rowToQueueData(row) };
}

// ── Prepared statements ───────────────────────────────────────────────────────

const stmts = {
  // queue table
  pushQueue: db.prepare<
    void,
    [
      number,
      string,
      string,
      string,
      string,
      string,
      number,
      string,
      string,
      string,
      number,
    ]
  >(`
    INSERT INTO queue (chat_id, link, title, image, artist, duration, req_by_id, req_by_fname, mp3_link, provider, video)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  countQueue: db.prepare<{ n: number }, [number]>(
    "SELECT COUNT(*) AS n FROM queue WHERE chat_id = ?",
  ),

  firstQueue: db.prepare<DbRow, [number]>(
    "SELECT * FROM queue WHERE chat_id = ? ORDER BY id ASC LIMIT 1",
  ),

  deleteById: db.prepare<void, [number]>("DELETE FROM queue WHERE id = ?"),

  // Scoped to chat_id so an API caller can't delete another chat's rows by id.
  deleteByIdForChat: db.prepare<void, [number, number]>(
    "DELETE FROM queue WHERE id = ? AND chat_id = ?",
  ),

  allQueue: db.prepare<DbRow, [number]>(
    "SELECT * FROM queue WHERE chat_id = ? ORDER BY id ASC",
  ),

  deleteAllQueue: db.prepare<void, [number]>(
    "DELETE FROM queue WHERE chat_id = ?",
  ),

  insertAllQueue: db.prepare<
    void,
    [
      number,
      string,
      string,
      string,
      string,
      string,
      number,
      string,
      string,
      string,
      number,
    ]
  >(`
    INSERT INTO queue (chat_id, link, title, image, artist, duration, req_by_id, req_by_fname, mp3_link, provider, video)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  // current table
  upsertCurrent: db.prepare<
    void,
    [
      number,
      string,
      string,
      string,
      string,
      string,
      number,
      string,
      string,
      string,
      number,
    ]
  >(`
    INSERT INTO current (chat_id, link, title, image, artist, duration, req_by_id, req_by_fname, mp3_link, provider, video)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(chat_id) DO UPDATE SET
      link        = excluded.link,
      title       = excluded.title,
      image       = excluded.image,
      artist      = excluded.artist,
      duration    = excluded.duration,
      req_by_id   = excluded.req_by_id,
      req_by_fname= excluded.req_by_fname,
      mp3_link    = excluded.mp3_link,
      provider    = excluded.provider,
      video       = excluded.video
  `),

  getCurrent: db.prepare<DbRow, [number]>(
    "SELECT * FROM current WHERE chat_id = ?",
  ),

  deleteCurrent: db.prepare<void, [number]>(
    "DELETE FROM current WHERE chat_id = ?",
  ),
} as const;

// ── Queue class ───────────────────────────────────────────────────────────────

export class Queue {
  /**
   * Append a track to the queue.
   * @returns The new queue length for that chat (including the track just added).
   */
  push(chatId: number, data: QueueData): number {
    stmts.pushQueue.run(
      chatId,
      data.link,
      data.title,
      data.image,
      data.artist,
      data.duration,
      data.requestedBy.id,
      data.requestedBy.first_name,
      data.mp3_link,
      data.provider,
      data.video ? 1 : 0,
    );
    return stmts.countQueue.get(chatId)!.n;
  }

  /**
   * Remove and return the next track for a chat (FIFO).
   * Returns `undefined` if the queue is empty.
   */
  pop(chatId: number): QueueData | undefined {
    const row = stmts.firstQueue.get(chatId);
    if (!row) return undefined;
    stmts.deleteById.run(row.id);
    return rowToQueueData(row);
  }

  /** How many tracks are queued for a chat. */
  size(chatId: number): number {
    return stmts.countQueue.get(chatId)!.n;
  }

  /** True if there is at least one queued track. */
  has(chatId: number): boolean {
    return this.size(chatId) > 0;
  }

  /** All queued tracks for a chat, in play order, each with its stable id. */
  getAll(chatId: number): QueueItem[] {
    return stmts.allQueue.all(chatId).map(rowToQueueItem);
  }

  /** Delete all queued tracks for a chat. */
  clear(chatId: number): void {
    stmts.deleteAllQueue.run(chatId);
  }

  /** Fisher-Yates shuffle of the queue for a chat. */
  shuffle(chatId: number): void {
    const rows = stmts.allQueue.all(chatId);
    if (rows.length < 2) return;

    // Fisher-Yates in-place
    for (let i = rows.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rows[i], rows[j]] = [rows[j]!, rows[i]!];
    }

    // Replace all rows for this chat atomically
    const tx = db.transaction(() => {
      stmts.deleteAllQueue.run(chatId);
      for (const r of rows) {
        stmts.insertAllQueue.run(
          chatId,
          r.link,
          r.title,
          r.image,
          r.artist,
          r.duration,
          r.req_by_id,
          r.req_by_fname,
          r.mp3_link,
          r.provider,
          r.video,
        );
      }
    });
    tx();
  }

  /**
   * Remove a track at 1-based `position` from the queue.
   * Returns the removed track, or `undefined` if position is out of range.
   */
  delete(chatId: number, position: number): QueueData | undefined {
    const rows = stmts.allQueue.all(chatId);
    if (position < 1 || position > rows.length) return undefined;
    const row = rows[position - 1]!;
    stmts.deleteById.run(row.id);
    return rowToQueueData(row);
  }

  /**
   * Remove a track by its stable queue id (scoped to the chat).
   * @returns true if a row was deleted.
   */
  removeById(chatId: number, id: number): boolean {
    const res = stmts.deleteByIdForChat.run(id, chatId);
    return res.changes > 0;
  }

  /**
   * Reorder the queue to match `orderedIds` (the desired play order).
   *
   * Rows are re-inserted in the given order so the FIFO `id ASC` ordering
   * reflects it. Ids not belonging to this chat are ignored; any existing
   * tracks whose id is omitted from `orderedIds` are appended at the end in
   * their current order, so a stale client list can never drop tracks.
   */
  reorder(chatId: number, orderedIds: number[]): void {
    const rows = stmts.allQueue.all(chatId);
    if (rows.length < 2) return;

    const byId = new Map(rows.map((r) => [r.id, r]));
    const ordered: DbRow[] = [];
    for (const id of orderedIds) {
      const row = byId.get(id);
      if (row) {
        ordered.push(row);
        byId.delete(id);
      }
    }
    // Append any rows the client didn't mention (e.g. added since last poll).
    for (const row of rows) {
      if (byId.has(row.id)) ordered.push(row);
    }

    const tx = db.transaction(() => {
      stmts.deleteAllQueue.run(chatId);
      for (const r of ordered) {
        stmts.insertAllQueue.run(
          chatId,
          r.link,
          r.title,
          r.image,
          r.artist,
          r.duration,
          r.req_by_id,
          r.req_by_fname,
          r.mp3_link,
          r.provider,
          r.video,
        );
      }
    });
    tx();
  }

  // ── Current track ───────────────────────────────────────────────────────────

  /** Upsert the currently playing track for a chat. */
  setCurrent(chatId: number, data: QueueData): void {
    stmts.upsertCurrent.run(
      chatId,
      data.link,
      data.title,
      data.image,
      data.artist,
      data.duration,
      data.requestedBy.id,
      data.requestedBy.first_name,
      data.mp3_link,
      data.provider,
      data.video ? 1 : 0,
    );
  }

  /** Get the currently playing track for a chat, or `undefined`. */
  getCurrent(chatId: number): QueueData | undefined {
    const row = stmts.getCurrent.get(chatId);
    return row ? rowToQueueData(row) : undefined;
  }

  /** Clear the currently playing track for a chat. */
  clearCurrent(chatId: number): void {
    stmts.deleteCurrent.run(chatId);
  }
}

export const queue = new Queue();
