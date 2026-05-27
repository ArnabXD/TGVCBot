# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

TGVCBot is a Telegram bot that streams music in Telegram Voice Chats. It's a **pnpm monorepo** managed with Turborepo containing two apps:

- `apps/tgvcbot/` — The main bot (TypeScript, Node.js ≥ 16)
- `apps/website/` — Documentation site (Eleventy + Tailwind CSS)

## Commands

All commands run from the repo root using pnpm. Turborepo pipelines tasks across both workspaces.

```bash
# Development
pnpm dev              # Run all apps in parallel (dev mode)
pnpm build            # Build all apps
pnpm lint             # Lint all apps (zero warnings enforced)
pnpm format           # Prettier format all TS/JS/CSS in apps/

# Bot-specific (from apps/tgvcbot/)
pnpm dev              # Run with ts-node (no build required)
pnpm test             # TypeScript type-check only (tsc --noEmit)
pnpm build            # Compile to dist/ via tsc
pnpm lint             # ESLint with --max-warnings=0
```

The `test` script in the bot package is TypeScript compilation — there are no runtime tests.

## Architecture

### Dual-client design

The bot requires **two Telegram clients running simultaneously**:

1. **Bot client** (`src/bot.ts`) — A grammy `Bot` instance using `BOT_TOKEN`. Handles all user commands and sends messages.
2. **Userbot client** (`src/userbot.ts`) — A MTProto client via `telegram` (GramJS) using `API_ID`/`API_HASH`/`SESSION`. This is a regular Telegram account (not a bot) that actually joins the voice chat and streams audio. Required because the Telegram Bot API cannot participate in voice chats.

### Audio streaming pipeline

```
User command → Handler → Provider (search/resolve) → QueueData
    → tgcalls.streamOrQueue()
        → If playing: push to SQLite queue
        → If idle: GramTGCalls.stream()
            → ffmpeg (getReadable) converts source to s16le PCM stream
            → tgcalls-next streams raw audio into the voice chat via userbot
```

`src/tgcalls.ts` — `TGVCCalls` singleton. Maintains a `Map<chatId, GramTGCalls>` for concurrent per-chat voice streams. Listens for `audio-finish` to auto-advance the queue.

### Queue persistence

The queue is stored in SQLite (`./db/tgvc.sqlite`) via knex + better-sqlite3. Two tables:

- `queue` — upcoming tracks per chat (FIFO)
- `current` — currently playing track per chat (unique per chat_id)

Both tables are **truncated on startup** (not preserved across restarts).

### Stream providers

All providers extend `StreamProvider` (`src/providers/base.ts`) and produce a `QueueData` object:

| Provider | Source | Key field |
|----------|--------|-----------|
| `jiosaavn` | External API at `jsvn-tgvc.vercel.app` | `mp3_link` = direct audio URL |
| `youtube` | youtube-sr + ytdl-core | `mp3_link` = YouTube video ID |
| `telegram` | Telegram audio file | `mp3_link` = Telegram `file_id` |
| `radio` | Direct HTTP stream URL | `mp3_link` = stream URL |

Each provider is handled differently in `src/tgcalls.ts` `streamOrQueue()` — YouTube needs ytdl to get the actual stream URL at play time; Telegram files need the Bot API download URL.

### Handler registration

`src/handlers/index.ts` registers all grammy composers onto the bot in order. Each handler file exports a `Composer` instance. The `CheckInactiveVcMiddleware` middleware (in `src/middlewares/inactiveVc.ts`) guards control commands from running when no voice chat is active.

### Banner generation

When a track starts, `src/utils/banner.ts` generates a 600×300 PNG using:
- `sharp` — image resize/blur/composite
- `@napi-rs/canvas` — text rendering (`src/utils/text-to-image.ts`)

Falls back to plain text message if banner generation fails.

## Environment Setup

Copy `apps/tgvcbot/.env.sample` to `apps/tgvcbot/.env`:

| Variable | Description |
|----------|-------------|
| `API_ID` | Telegram API ID (from my.telegram.org) |
| `API_HASH` | Telegram API Hash |
| `SESSION` | GramJS StringSession for the userbot account |
| `BOT_TOKEN` | Telegram bot token from @BotFather |
| `LOG_CHANNEL` | Numeric chat ID for bot log messages |
| `THUMBNAIL` | Default thumbnail URL (optional) |
| `WATERMARK` | Text watermark on banners (optional, default: "TGVCBot") |

**ffmpeg must be installed** on the host — the bot checks for it on startup and exits if missing.

The SQLite DB file is created at `./db/tgvc.sqlite` relative to the working directory when the bot starts. Ensure the `db/` directory exists or is writable.

## Commit Conventions

Commits must follow Conventional Commits (enforced by commitlint + husky). lint-staged runs ESLint + Prettier on staged `.ts` files before commit.
