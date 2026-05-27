# ntgcalls-napi

Thread-safe Node-API (N-API) native bindings in Rust for `libntgcalls` (C-shared WebRTC library). Fully compatible with Node.js and Bun.

## Features

- **100% Thread-Safe Event Loop Integration**: Translates background WebRTC C++ threads into the main JS/TS event loop crash-free using N-API `ThreadsafeFunction`.
- **Tokio-backed Asynchronous Promises**: Non-blocking async operations (`create`, `connect`, etc.) running on Tokio threadpool via safe one-shot synchronization channels.
- **Dynamic Linkage Isolation**: Automatically resolves dynamic dependency `libntgcalls` relative to its own native addon directory using `$ORIGIN/lib` RPATH.

## Prerequisites

1. **Rust & Cargo**: Required to compile the native addon:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
2. **libntgcalls**: The shared library (`libntgcalls.so` / `libntgcalls.dylib` / `ntgcalls.dll`) must be present in the `./lib/` folder prior to compilation.

## Build Instructions

To compile the native binary for development, run:
```bash
cargo build --release
```
Then copy the compiled target:
- **Linux**: `cp target/release/libntgcalls.so ./ntgcalls.node`
- **macOS**: `cp target/release/libntgcalls.dylib ./ntgcalls.node`
- **Windows**: `cp target/release/ntgcalls.dll ./ntgcalls.node`

## Usage Example

```typescript
import { NtgCalls } from 'ntgcalls-napi';

const ntg = new NtgCalls();

// Register connection states
ntg.on_connection_change((chatId, kind, state) => {
  console.log(`Connection changed: chat=${chatId}, kind=${kind}, state=${state}`);
});

// Register track-end signals
ntg.on_stream_end((chatId) => {
  console.log(`Song finished on chat: ${chatId}`);
});

// Start WebRTC session
const offerSdp = await ntg.create(123456789);
console.log('Generated WebRTC Offer SDP:', offerSdp);
```
