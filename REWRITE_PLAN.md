# TGVCBot Bun Rewrite Plan

## Stack Summary

| Old | New |
|-----|-----|
| `grammy` + `telegram` (GramJS) | `@mtkruto/node` (single lib, both clients) |
| `tgcalls-next` | **custom `bun:ffi` wrapper** around `libntgcalls.so` |
| `knex` + `better-sqlite3` | `bun:sqlite` (built-in) |
| `ts-node` | `bun run` (native TS) |
| `dotenv` | built-in Bun `.env` loading |
| `html-escaper` | `Bun.escapeHTML()` |
| `axios` | native `fetch` |
| monorepo / Turborepo | **flat single package** |

---

## Project Structure

```
tgvcbot/
├── src/
│   ├── app.ts                  # entry point
│   ├── env.ts                  # env validation
│   ├── clients.ts              # bot + userbot MTKruto clients
│   ├── db.ts                   # bun:sqlite instance + schema init
│   ├── queue.ts                # Queue class (bun:sqlite, sync)
│   ├── ffmpeg.ts               # ffmpeg shell command string builder
│   ├── tgcalls.ts              # orchestrator
│   ├── ntgcalls/
│   │   ├── ffi.ts              # bun:ffi declarations (1:1 with ntgcalls.h)
│   │   ├── async.ts            # ntg_async_struct promise bridge
│   │   └── client.ts           # high-level TS wrapper (NTgCalls class)
│   ├── handlers/
│   │   ├── index.ts
│   │   ├── jiosaavn.ts
│   │   ├── youtube.ts
│   │   ├── radio.ts
│   │   ├── play.ts
│   │   ├── controls.ts
│   │   ├── queue.ts
│   │   ├── leave.ts
│   │   ├── start.ts
│   │   └── help.ts
│   ├── providers/
│   │   ├── base.ts
│   │   ├── jiosaavn.ts
│   │   └── youtube.ts
│   ├── middlewares/
│   │   ├── inactiveVc.ts
│   │   └── errorHandler.ts
│   └── utils/
│       ├── banner.ts
│       ├── text-to-image.ts
│       ├── messages.ts
│       └── hhmmss.ts
├── scripts/
│   └── gen-session.ts          # one-time MTKruto auth string generator
├── db/                         # sqlite file lives here (gitignored)
├── .env
├── package.json
└── tsconfig.json
```

---

## Phases

### Phase 1 — Project Scaffold
- [ ] Create flat `package.json` with Bun scripts
- [ ] Write `tsconfig.json` with `bun-types`
- [ ] Remove old monorepo config (turbo.json, pnpm-workspace.yaml, website app)

**`package.json`:**
```json
{
  "name": "tgvcbot",
  "scripts": {
    "dev": "bun --watch src/app.ts",
    "start": "bun src/app.ts",
    "lint": "eslint src --ext .ts --max-warnings=0"
  },
  "dependencies": {
    "@mtkruto/node": "latest",
    "@napi-rs/canvas": "^0.1.34",
    "fluent-ffmpeg": "^2.1.2",
    "sharp": "^0.31.3",
    "youtube-sr": "^4.3.4",
    "@distube/ytdl-core": "latest"
  },
  "devDependencies": {
    "bun-types": "latest",
    "@typescript-eslint/eslint-plugin": "^5.30.6",
    "@typescript-eslint/parser": "^5.30.6"
  }
}
```

Removed: `grammy`, `telegram`, `tgcalls-next`, `knex`, `better-sqlite3`, `ts-node`,
`dotenv`, `html-escaper`, `axios`, `rimraf`, `envalid`, `ytdl-core`

**`tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["bun-types"]
  },
  "include": ["src"]
}
```

---

### Phase 2 — NTgCalls FFI Layer (`src/ntgcalls/`)

The core of the rewrite. Three files wrapping the C library.

**Key C API (from `ntgcalls.h`):**
```c
uintptr_t ntg_init();
int ntg_destroy(uintptr_t ptr);
int ntg_create(uintptr_t ptr, int64_t chatID, char** buffer, ntg_async_struct future);
int ntg_connect(uintptr_t ptr, int64_t chatID, char* params, bool isPresentation, ntg_async_struct future);
int ntg_set_stream_sources(uintptr_t ptr, int64_t chatID, ntg_stream_mode_enum streamMode, ntg_media_description_struct desc, ntg_async_struct *future);
int ntg_pause(uintptr_t ptr, int64_t chatID, ntg_async_struct future);
int ntg_resume(uintptr_t ptr, int64_t chatID, ntg_async_struct future);
int ntg_stop(uintptr_t ptr, int64_t chatID, ntg_async_struct future);
int ntg_on_stream_end(uintptr_t ptr, ntg_stream_callback callback, void* userData);
int ntg_on_connection_change(uintptr_t ptr, ntg_connection_callback callback, void* userData);
```

**Key structs:**
```c
typedef struct {
    ntg_media_source_enum mediaSource;  // NTG_SHELL=2, NTG_FFMPEG=4, NTG_FILE=1
    char* input;                        // shell command / file path
    uint32_t sampleRate;
    uint8_t channelCount;
    bool keepOpen;
} ntg_audio_description_struct;

typedef struct {
    ntg_audio_description_struct* microphone;
    ntg_audio_description_struct* speaker;  // null
    ntg_video_description_struct* camera;   // null
    ntg_video_description_struct* screen;   // null
} ntg_media_description_struct;

typedef struct {
    void*              userData;
    int*               errorCode;
    char**             errorMessage;
    ntg_async_callback promise;   // called when async op completes
} ntg_async_struct;
```

#### `src/ntgcalls/ffi.ts`
- `dlopen(env.NTGCALLS_LIB_PATH, { ... })` with all function signatures
- `uintptr_t` → `FFIType.ptr`, `int64_t` → `FFIType.i64`, `char*` → `FFIType.cstring`, `char**` → `FFIType.ptr`, `bool` → `FFIType.bool`
- Structs passed by value need manual buffer layout

#### `src/ntgcalls/async.ts`
- Allocates `ntg_async_struct` in a `Uint8Array` (32 bytes on 64-bit)
- Writes pointers to errorCode and errorMessage output buffers
- Wraps in a `Promise<void>` resolved/rejected by the C callback
- Exports `makeAsyncStruct(): { structPtr: Uint8Array, promise: Promise<void> }`

#### `src/ntgcalls/client.ts`
- `NTgCalls extends EventEmitter`
- Constructor: calls `ntg_init()`, registers `ntg_on_stream_end` → emits `"stream-end"` event
- `create(chatId)` → returns WebRTC offer JSON string
- `connect(chatId, serverParams)` → completes WebRTC handshake
- `setAudioSource(chatId, ffmpegCmd)` → builds `ntg_media_description_struct` in memory, calls `ntg_set_stream_sources` with `NTG_SHELL`
- `pause/resume/stop(chatId)` → thin wrappers
- Export singleton: `export const ntgCalls = new NTgCalls()`

---

### Phase 3 — `ffmpeg.ts`

No longer returns a Node.js stream. Builds the **shell command string** NTgCalls runs internally:

```typescript
export function buildFfmpegCmd(input: string): string {
  return `ffmpeg -i "${input}" -f s16le -ar 48000 -ac 1 -`;
}

export function testFFMPEG() {
  if (!Bun.which("ffmpeg")) {
    console.error("[Error]: ffmpeg not found in PATH");
    process.exit(1);
  }
}
```

> NTgCalls with `NTG_SHELL` spawns this command itself and reads stdout as raw PCM.
> We no longer manage ffmpeg processes or Node.js streams.

---

### Phase 4 — Database Layer

**`src/db.ts`** — `bun:sqlite` instance + WAL mode + `CREATE TABLE IF NOT EXISTS` schema

**`src/queue.ts`** — fully synchronous (bun:sqlite is sync), no `async/await` needed:
- Prepare all statements once at module load
- Truncate both tables on module init (same startup behaviour as before)
- Same public interface: `queue.push()`, `queue.pop()`, `queue.setCurrent()`, `queue.getAll()`, `queue.clear()`, `queue.shuffle()`
- `QueueData` interface stays identical

---

### Phase 5 — MTKruto Clients (`src/clients.ts`)

```typescript
import { Client } from "@mtkruto/node";

// bot: handles commands, sends messages
export const bot = new Client({ apiId, apiHash });

// userbot: joins voice chats, streams audio (user-only MTProto ops)
export const userbot = new Client({ apiId, apiHash });

export async function startClients() {
  await userbot.importAuthString(env.SESSION);
  await Promise.all([
    bot.start({ botToken: env.BOT_TOKEN }),
    userbot.start(),
  ]);
}
```

Note: `SESSION` env var now holds an MTKruto authString (not a GramJS StringSession).
Use `scripts/gen-session.ts` to generate it once.

---

### Phase 6 — `tgcalls.ts` (orchestrator)

New stream flow:
```
streamOrQueue(chat, data)
  1. build ffmpeg shell cmd for the source type
  2. ntgCalls.create(chatId)             → WebRTC offer JSON
  3. userbot.startVideoChat(chatId)      → VideoChatActive { id }  [if not already active]
  4. userbot.joinVideoChat(vcId, offer)  → server answer JSON
  5. ntgCalls.connect(chatId, answer)    → WebRTC handshake done
  6. ntgCalls.setAudioSource(chatId, cmd)→ audio flows
  7. ntgCalls on("stream-end")          → auto-advance queue
```

- `TGVCCalls` class maintains:
  - `vcIds: Map<number, string>` — chatId → MTKruto VideoChatActive.id
  - `active: Set<number>` — chatIds with live streams
- `onStreamEnd(chatId)` → pop next from queue → play, or leaveVideoChat + ntgCalls.stop
- YouTube: resolve real audio URL via `@distube/ytdl-core` before building ffmpeg cmd
- Telegram files: `bot.getFile(file_id)` → download URL → ffmpeg cmd

---

### Phase 7 — Handlers

grammy `Composer` → MTKruto `Composer` (same pattern, same method names).

Key API differences:
| grammy | MTKruto |
|--------|---------|
| `import { Composer } from "grammy"` | `import { Composer } from "@mtkruto/node"` |
| `parse_mode: "HTML"` | `parseMode: "HTML"` |
| `disable_web_page_preview: true` | `linkPreview: { isDisabled: true }` |
| `new InlineKeyboard().text(label, data)` | `[[{ text: label, callbackData: data }]]` |
| `escape(str)` (html-escaper) | `Bun.escapeHTML(str)` |
| `ctx.from.id` | `ctx.from?.id` |

All handler files (`jiosaavn.ts`, `youtube.ts`, `radio.ts`, `play.ts`, `controls.ts`,
`queue.ts`, `leave.ts`, `start.ts`, `help.ts`) get updated imports + the above substitutions.

---

### Phase 8 — `env.ts`

Replace `envalid` with a lean inline validator:

```typescript
const req = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env var: ${k}`);
  return v;
};

export default {
  API_ID:            parseInt(req("API_ID")),
  API_HASH:          req("API_HASH"),
  SESSION:           req("SESSION"),            // MTKruto authString
  BOT_TOKEN:         req("BOT_TOKEN"),
  LOG_CHANNEL:       parseInt(req("LOG_CHANNEL")),
  THUMBNAIL:         process.env.THUMBNAIL ?? "https://telegra.ph/file/6b07279fd80ef2b844ed0.png",
  WATERMARK:         process.env.WATERMARK ?? "TGVCBot",
  NTGCALLS_LIB_PATH: req("NTGCALLS_LIB_PATH"), // path to libntgcalls.so / .dylib
};
```

---

### Phase 9 — `app.ts`

```typescript
import { testFFMPEG } from "./ffmpeg";
import { startClients, bot, log } from "./clients";
import { InitHandlers } from "./handlers";

testFFMPEG();
InitHandlers(bot);
await startClients();
await log("🚀 TGVCBot is running");
```

---

## Obtaining `libntgcalls.so`

**Option A — PyPI pre-built (recommended for Linux x64):**
```bash
pip install ntgcalls
python -c "import ntgcalls, os; print(os.path.dirname(ntgcalls.__file__))"
# copy the .so from that path
```

**Option B — Build from source:**
```bash
git clone https://github.com/pytgcalls/ntgcalls
cd ntgcalls
python3 setup.py build_lib   # requires clang 20+, cmake 3.31+
# output in ./build/
```

Add to `.env`:
```
NTGCALLS_LIB_PATH=/path/to/libntgcalls.so
```

---

## Session Migration (one-time, existing deployments)

`scripts/gen-session.ts`:
```typescript
import { Client } from "@mtkruto/node";
const client = new Client({
  apiId: Number(process.env.API_ID),
  apiHash: process.env.API_HASH!,
});
await client.start({
  phone:    () => prompt("Phone: ")!,
  code:     () => prompt("Code: ")!,
  password: () => prompt("2FA password (leave blank if none): ")!,
});
console.log("\nSESSION=" + await client.exportAuthString());
await client.disconnect();
```

```bash
bun scripts/gen-session.ts
```

---

## Risk Register

| Risk | Severity | Mitigation |
|------|----------|-----------|
| `ntg_async_struct` memory layout / alignment | High | Verify with a minimal Bun FFI test before integrating |
| `NTG_SHELL` command with URLs containing special chars | Medium | Quote args in ffmpeg cmd; test with live URLs |
| MTKruto `joinVideoChat` return type (string vs object) | Low | Check at integration test time |
| `@napi-rs/canvas` + `sharp` on Bun | Low | Both support Node-API; Bun supports napi |
| `@distube/ytdl-core` stability | Medium | Monitor; fallback to `yt-dlp` subprocess if broken |
| MTKruto pre-1.0 API changes | Medium | Pin exact version; read changelog on updates |
| `ntg_on_stream_end` not firing when NTG_SHELL exits | Medium | Test with `keepOpen: false`; NTgCalls detects pipe EOF |

---

## Progress

- [ ] Phase 1 — Project Scaffold
- [ ] Phase 2 — NTgCalls FFI Layer
- [ ] Phase 3 — ffmpeg.ts
- [ ] Phase 4 — Database Layer
- [ ] Phase 5 — MTKruto Clients
- [ ] Phase 6 — tgcalls.ts orchestrator
- [ ] Phase 7 — Handlers
- [ ] Phase 8 — env.ts
- [ ] Phase 9 — app.ts