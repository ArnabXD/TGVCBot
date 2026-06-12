# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

TGVCBot is a Telegram bot that streams music into Telegram Voice Chats. The `feature/bun-rewrite` branch (this branch) is a complete rewrite as a **single-package Bun app** — the pnpm/Turborepo monorepo, grammy, GramJS, and tgcalls-next from `main` are all gone.

Stack: **Bun** runtime, **Biome** lint/format, **MTKruto** (`@mtkruto/node`) for both Telegram clients, **`@arnabxd/ntgcalls-napi`** (native NTgCalls bindings) for WebRTC audio streaming, **Hono** for the Mini App HTTP server, **bun:sqlite** for the queue.

## Commands

```bash
bun install            # Install dependencies
bun run dev            # Run with watch mode (bun --watch src/app.ts)
bun start              # Run once
bun run lint           # biome check src
bun run lint:fix       # biome check --write src
bun run format         # biome format --write src
bun run gen-session    # Interactive login to generate the userbot SESSION string
```

There is no test suite and no typecheck script — `biome check` is the only verification (TypeScript is not installed; tsconfig.json serves the editor and Bun's transpiler only).

Note: `.github/workflows/ci.yml` is stale from the pnpm-era `main` branch and does not match this branch's tooling.

Commit messages follow Conventional Commits style (`feat:`, `fix:`, `chore:`). Do not add a Co-Authored-By trailer.

## Architecture

### Dual-client design (`src/clients.ts`)

Two MTKruto `Client` instances share the same API credentials:

1. **bot** — authenticates with `BOT_TOKEN`; receives commands, sends messages.
2. **userbot** — a real user account (auth string from `SESSION`, imported via `importAuthString` on every start); joins/starts the voice chat and performs the WebRTC join, since bots cannot participate in voice chats. Uses a Telegram Desktop device fingerprint (`src/device.ts`).

Both persist MTProto sessions to disk (`./db/bot-session`, `./db/userbot-session`).

### Audio streaming pipeline

```
Command/API → Provider.getSong() → QueueData → tgcalls.streamOrQueue()
    → already active: push to SQLite queue
    → idle: play()
        1. resolveFfmpegCmd(data)            — provider-specific source resolution
        2. ntgCalls.create(chatId)           → WebRTC offer JSON
        3. ensureVcId() / startVideoChat()   — find or start the VC
        4. userbot.joinVideoChat(vcId, offer) → server answer (retried once with a
           fresh offer on transient join errors — stale SSRCs cause rejections)
        5. ntgCalls.connect(chatId, answer) + waitForConnected()
        6. ntgCalls.setAudioSource(chatId, ffmpegCmd) — audio flows
```

Key points in `src/tgcalls.ts` (the `TGVCCalls` singleton):

- **Hot-swap**: when a chat is already active, `setStreamSources()` replaces the media sources instantly without re-doing the WebRTC handshake (used by skip and queue advance). ntgcalls (verified on v0.3.1) emits **no spurious stream-end on hot-swap** — every `stream-end` is a real track end; do not add swap-suppression logic.
- **Video tracks** (`QueueData.video`, set by `/ytvideo`): a second shell-ffmpeg source (`camera` in the MediaDescription) feeds raw yuv420p frames at a fixed 1280×720@30 canvas (`buildFfmpegVideoCmd` letterboxes via scale+pad — frame size must exactly match the dimensions declared to ntgcalls). The VC join uses `isVideoEnabled: true`; hot-swapping a video track onto an audio-only join requires dropping the ntgcalls session and re-joining (tracked in `videoJoined`). Queue advance fires on the **audio** stream-end only (video stream-ends are filtered in the wrapper).
- On `stream-end`: pop next track and hot-swap, or tear down (stop NTgCalls + leave VC) if the queue is empty.
- NTgCalls runs ffmpeg itself (shell mode) — `src/ffmpeg.ts` only builds the command string, which must write raw PCM (s16le, 48 kHz, mono) to stdout. ffmpeg presence is checked at startup; missing → exit.
- `src/ntgcalls/client.ts` wraps the napi bindings in an EventEmitter, bridges native C++ logs into consola (filtered by `NTGCALLS_LOG_LEVEL`), and implements `waitForConnected()` (Telegram group VCs signal Connected only after `can_self_unmute` is granted; falls back after 15 s).

### Queue persistence (`src/db.ts`, `src/queue.ts`)

`bun:sqlite` (synchronous, WAL mode) at `./db/tgvc.sqlite`, prepared statements at module load. Tables: `queue` (FIFO per chat, ordered by `id ASC`) and `current` (one row per chat). Both are **truncated on startup**. Reorder/shuffle work by delete-and-reinsert inside a transaction so the autoincrement id order reflects play order.

### Stream providers (`src/providers/`)

Providers extend `StreamProvider` (`base.ts`) with `search()` and `getSong() → QueueData`. The meaning of `QueueData.mp3_link` differs per provider and is resolved in `tgcalls.resolveFfmpegCmd()`:

| Provider | `mp3_link` holds | Resolved at play time |
|----------|------------------|----------------------|
| `jiosaavn` | direct audio URL | passed straight to ffmpeg |
| `youtube` | video ID | fresh stream URL via the **yt-dlp CLI** (`src/ytdlp.ts`; `bestaudio`, video tracks add `bestvideo[height<=720]`). `extractYouTubeId()` lets `/yt`/`/ytvideo` accept pasted links. Do not reintroduce ytdl-core libraries — all their clients get 403 from googlevideo (unsolved n-sig/poToken) |
| `telegram` | Telegram `file_id` | downloaded to `/tmp`, deleted on stream-end (no provider class — handled in `handlers/play.ts`) |
| `radio` | stream URL | passed straight to ffmpeg (`radiobrowser.ts` queries the radio-browser.info API) |

### Handlers (`src/handlers/`)

MTKruto `Composer` instances registered in order by `initHandlers()` (`index.ts`). Control commands (`/pause`, `/resume`, `/skip`, `/shuffle`) are guarded by the `checkInactiveVc` middleware (`src/middlewares/inactiveVc.ts`), which rejects private chats and chats with no live stream.

### Mini App + HTTP server (`src/server.ts`, `public/`)

Hono on `Bun.serve` (port `PORT`, default 3000). All `/api/*` routes require a valid Telegram Mini App `initData` signature in the `Authorization` header, verified by `src/utils/auth.ts` against `BOT_TOKEN`. Endpoints: `/api/status`, `/api/search`, `/api/queue/{add,remove,reorder,clear}`, `/api/control`. Static fallback serves `public/` — a no-build-step Alpine.js (CDN) single-page Mini App (`index.html`, `app.js`, `style.css`). Setting `WEBAPP_SHORT_NAME` makes `/play` and `/app` attach a button opening the Mini App.

### Banner generation (`src/utils/banner.ts`)

Now-playing messages render a PNG banner via `sharp` + `@napi-rs/canvas` (`text-to-image.ts`, fonts in `fonts/`); on failure the bot falls back to a plain-text message.

### Gotcha: env import order

`src/env.ts` (envalid) sets `consola.level` as a side effect. Tagged loggers (`consola.withTag`) capture the level at creation, so `import "./env"` must come before any module that creates loggers — `src/app.ts` documents this.

## Environment Setup

Copy `.env.example` to `.env`. Required: `API_ID`, `API_HASH` (my.telegram.org), `SESSION` (generate with `bun run gen-session`), `BOT_TOKEN`, `LOG_CHANNEL`. Optional: `THUMBNAIL`, `WATERMARK`, `PORT`, `LOG_LEVEL`, `NTGCALLS_LOG_LEVEL` (native C++ log verbosity, default `error`), `WEBAPP_SHORT_NAME` (BotFather Mini App short name; empty disables the Mini App button).

**ffmpeg must be installed** on the host (fatal check at startup). **yt-dlp must be installed and kept updated** (`yt-dlp -U`) for YouTube playback — a stale yt-dlp is the usual cause when YouTube tracks die instantly (googlevideo 403 → immediate stream-end). The `db/` directory must be writable (SQLite DB + MTProto session storage).
