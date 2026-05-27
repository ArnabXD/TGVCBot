/**
 * High-level NTgCalls TypeScript wrapper.
 *
 * Usage flow per chat:
 *   1. ntgCalls.create(chatId)                    → WebRTC offer JSON
 *   2. userbot.joinVideoChat(vcId, offer)          → server answer JSON
 *   3. ntgCalls.connect(chatId, answer)            → WebRTC handshake complete
 *   4. ntgCalls.setAudioSource(chatId, ffmpegCmd)  → audio starts flowing
 *
 * Events emitted:
 *   "stream-end"         (chatId: number)
 *   "connection-change"  (chatId: number, info: { kind: number; state: number })
 */

import { JSCallback, type Pointer, ptr } from "bun:ffi";
import EventEmitter from "node:events";
import { makeAsyncStruct } from "./async";
import lib, {
  AUDIO_DESC,
  AUDIO_DESC_SIZE,
  MEDIA_DESC,
  MEDIA_DESC_SIZE,
  NTG_MEDIA_SOURCE,
  NTG_STREAM_MODE,
} from "./ffi";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Allocate a null-terminated UTF-8 C string in a Buffer. */
function toCStr(s: string): Buffer {
  return Buffer.from(`${s}\0`, "utf8");
}

/**
 * Build ntg_audio_description_struct in a Uint8Array.
 * Returns both the struct buffer and the input string buffer
 * (must both be kept alive until the async call resolves).
 */
function buildAudioDesc(ffmpegCmd: string): {
  audioBuf: Uint8Array;
  inputBuf: Buffer;
} {
  const inputBuf = toCStr(ffmpegCmd);
  const audioBuf = new Uint8Array(AUDIO_DESC_SIZE);
  const view = new DataView(audioBuf.buffer);

  view.setInt32(AUDIO_DESC.mediaSource.offset, NTG_MEDIA_SOURCE.SHELL, true); // i32 LE
  // 4 bytes padding — already zero
  view.setBigUint64(AUDIO_DESC.input.offset, BigInt(ptr(inputBuf)), true); // ptr LE
  view.setUint32(AUDIO_DESC.sampleRate.offset, 48000, true); // u32 LE
  view.setUint8(AUDIO_DESC.channelCount.offset, 1); // mono
  view.setUint8(AUDIO_DESC.keepOpen.offset, 0); // false → stream ends with command

  return { audioBuf, inputBuf };
}

/**
 * Build ntg_media_description_struct in a Uint8Array.
 * Only microphone is set; speaker/camera/screen are null (0).
 */
function buildMediaDesc(micPtr: number): Uint8Array {
  const buf = new Uint8Array(MEDIA_DESC_SIZE); // zero-initialised → speaker/camera/screen = null
  const view = new DataView(buf.buffer);
  view.setBigUint64(MEDIA_DESC.microphone.offset, BigInt(micPtr), true);
  return buf;
}

// ── NTgCalls class ────────────────────────────────────────────────────────────

export class NTgCalls extends EventEmitter {
  private readonly handle: Pointer;

  // Hold strong references so GC never collects these callbacks
  private readonly _streamEndCb: JSCallback;
  private readonly _connectionCb: JSCallback;

  constructor() {
    super();

    const h = lib.ntg_init() as Pointer;
    if (!h)
      throw new Error("ntg_init() returned null — check NTGCALLS_LIB_PATH");
    this.handle = h;

    // ntg_stream_callback:
    //   void(*)(uintptr_t ptr, int64_t chatId,
    //           ntg_stream_type_enum, ntg_stream_device_enum, void* userData)
    this._streamEndCb = new JSCallback(
      (
        _ptr: Pointer,
        chatIdRaw: number,
        _type: number,
        _device: number,
        _ud: Pointer,
      ) => {
        this.emit("stream-end", chatIdRaw);
      },
      {
        args: ["ptr", "i64", "i32", "i32", "ptr"],
        returns: "void",
        threadsafe: true,
      },
    );

    lib.ntg_on_stream_end(this.handle, this._streamEndCb.ptr!, null);

    // ntg_connection_callback:
    //   void(*)(uintptr_t, int64_t, ntg_network_info_struct{kind:i32,state:i32}, void*)
    // The struct is 8 bytes and on x64 System V ABI it's passed in two integer
    // registers — which Bun exposes as two consecutive i32 args.
    this._connectionCb = new JSCallback(
      (
        _ptr: Pointer,
        chatIdRaw: number,
        kind: number,
        state: number,
        _ud: Pointer,
      ) => {
        this.emit("connection-change", chatIdRaw, { kind, state });
      },
      {
        args: ["ptr", "i64", "i32", "i32", "ptr"],
        returns: "void",
        threadsafe: true,
      },
    );

    lib.ntg_on_connection_change(this.handle, this._connectionCb.ptr!, null);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Generate a WebRTC offer for the given chat.
   * Returns the offer as a JSON string.
   */
  async create(chatId: number): Promise<string> {
    // C writes a char* into this slot; we pre-populate with our output buffer
    // pointer so C knows where to write.
    const outBuf = new Uint8Array(8192); // generous buffer for any offer JSON
    const ptrHolder = new BigUint64Array(1);
    ptrHolder[0] = BigInt(ptr(outBuf));

    const { buf: asyncBuf, promise } = makeAsyncStruct();

    const rc = lib.ntg_create(
      this.handle,
      chatId,
      ptr(ptrHolder), // char** buffer
      ptr(asyncBuf), // ntg_async_struct (by value → ptr to bytes)
    );

    if (rc !== 0) throw new Error(`ntg_create returned ${rc} synchronously`);
    await promise;

    // The offer string was written into outBuf by C
    const nullIdx = outBuf.indexOf(0);
    return new TextDecoder().decode(
      outBuf.subarray(0, nullIdx === -1 ? undefined : nullIdx),
    );
  }

  /**
   * Complete the WebRTC handshake using the server's answer JSON.
   * @param params — JSON string returned by MTKruto joinVideoChat
   */
  async connect(
    chatId: number,
    params: string,
    isPresentation = false,
  ): Promise<void> {
    const paramsBuf = toCStr(params);
    const { buf: asyncBuf, promise } = makeAsyncStruct();

    const rc = lib.ntg_connect(
      this.handle,
      chatId,
      ptr(paramsBuf),
      isPresentation,
      ptr(asyncBuf),
    );

    if (rc !== 0) throw new Error(`ntg_connect returned ${rc} synchronously`);
    await promise;
    void paramsBuf; // keep alive until settled
  }

  /**
   * Set (or replace) the audio source for a live call.
   * @param ffmpegCmd — Shell command NTgCalls will spawn; stdout must be raw PCM s16le 48kHz mono.
   *                    e.g. `ffmpeg -i "https://..." -f s16le -ar 48000 -ac 1 -`
   */
  async setAudioSource(chatId: number, ffmpegCmd: string): Promise<void> {
    const { audioBuf, inputBuf } = buildAudioDesc(ffmpegCmd);
    const mediaBuf = buildMediaDesc(ptr(audioBuf));
    const { buf: asyncBuf, promise } = makeAsyncStruct();

    const rc = lib.ntg_set_stream_sources(
      this.handle,
      chatId,
      NTG_STREAM_MODE.CAPTURE,
      ptr(mediaBuf), // ntg_media_description_struct by value → ptr
      ptr(asyncBuf),
    );

    if (rc !== 0)
      throw new Error(`ntg_set_stream_sources returned ${rc} synchronously`);
    await promise;
    void inputBuf; // keep alive
    void audioBuf;
  }

  async pause(chatId: number): Promise<void> {
    const { buf, promise } = makeAsyncStruct();
    const rc = lib.ntg_pause(this.handle, chatId, ptr(buf));
    if (rc !== 0) throw new Error(`ntg_pause returned ${rc}`);
    await promise;
  }

  async resume(chatId: number): Promise<void> {
    const { buf, promise } = makeAsyncStruct();
    const rc = lib.ntg_resume(this.handle, chatId, ptr(buf));
    if (rc !== 0) throw new Error(`ntg_resume returned ${rc}`);
    await promise;
  }

  async mute(chatId: number): Promise<void> {
    const { buf, promise } = makeAsyncStruct();
    const rc = lib.ntg_mute(this.handle, chatId, ptr(buf));
    if (rc !== 0) throw new Error(`ntg_mute returned ${rc}`);
    await promise;
  }

  async unmute(chatId: number): Promise<void> {
    const { buf, promise } = makeAsyncStruct();
    const rc = lib.ntg_unmute(this.handle, chatId, ptr(buf));
    if (rc !== 0) throw new Error(`ntg_unmute returned ${rc}`);
    await promise;
  }

  async stop(chatId: number): Promise<void> {
    const { buf, promise } = makeAsyncStruct();
    const rc = lib.ntg_stop(this.handle, chatId, ptr(buf));
    if (rc !== 0) throw new Error(`ntg_stop returned ${rc}`);
    await promise;
  }

  /** Call on process exit to release the native instance. */
  destroy(): void {
    this._streamEndCb.close();
    this._connectionCb.close();
    lib.ntg_destroy(this.handle);
  }
}

// Singleton — construction is deferred to first import (after env is loaded).
export const ntgCalls = new NTgCalls();
