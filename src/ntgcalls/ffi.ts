/**
 * Low-level bun:ffi declarations for libntgcalls.
 * 1:1 mapping to ntgcalls.h — no logic here, just the dlopen.
 *
 * Struct layout (64-bit System V ABI):
 *
 * ntg_async_struct (32 bytes):
 *   [0]  void*              userData      (8)
 *   [8]  int*               errorCode     (8)
 *   [16] char**             errorMessage  (8)
 *   [24] ntg_async_callback promise       (8)
 *
 * ntg_audio_description_struct (24 bytes):
 *   [0]  int32_t  mediaSource   (4)
 *   [4]  <pad>                  (4)  — pointer alignment
 *   [8]  char*    input         (8)
 *   [16] uint32_t sampleRate    (4)
 *   [20] uint8_t  channelCount  (1)
 *   [21] bool     keepOpen      (1)
 *   [22] <pad>                  (2)
 *
 * ntg_media_description_struct (32 bytes):
 *   [0]  ntg_audio_description_struct* microphone (8)
 *   [8]  ntg_audio_description_struct* speaker    (8)
 *   [16] ntg_video_description_struct* camera     (8)
 *   [24] ntg_video_description_struct* screen     (8)
 *
 * Structs passed by value to C are passed as ptr (TypedArray holding the bytes).
 */

import { dlopen, FFIType } from "bun:ffi";
import env from "../env";

const { symbols: lib } = dlopen(env.NTGCALLS_LIB_PATH, {
  // ── Lifecycle ────────────────────────────────────────────────────────────
  ntg_init: {
    args: [],
    returns: FFIType.ptr,
  },
  ntg_destroy: {
    args: [FFIType.ptr],
    returns: FFIType.i32,
  },

  // ── Group call ───────────────────────────────────────────────────────────
  // int ntg_create(uintptr_t ptr, int64_t chatID, char** buffer, ntg_async_struct future)
  // — buffer is a ptr to where C writes the offer string pointer
  // — future is the async struct passed by value → we pass as ptr (buffer holding bytes)
  ntg_create: {
    args: [FFIType.ptr, FFIType.i64, FFIType.ptr, FFIType.ptr],
    returns: FFIType.i32,
  },
  // int ntg_connect(uintptr_t ptr, int64_t chatID, char* params, bool isPresentation, ntg_async_struct future)
  ntg_connect: {
    args: [FFIType.ptr, FFIType.i64, FFIType.ptr, FFIType.bool, FFIType.ptr],
    returns: FFIType.i32,
  },
  // int ntg_set_stream_sources(uintptr_t, int64_t, ntg_stream_mode_enum, ntg_media_description_struct, ntg_async_struct*)
  ntg_set_stream_sources: {
    args: [FFIType.ptr, FFIType.i64, FFIType.i32, FFIType.ptr, FFIType.ptr],
    returns: FFIType.i32,
  },

  // ── Playback control ─────────────────────────────────────────────────────
  ntg_pause: {
    args: [FFIType.ptr, FFIType.i64, FFIType.ptr],
    returns: FFIType.i32,
  },
  ntg_resume: {
    args: [FFIType.ptr, FFIType.i64, FFIType.ptr],
    returns: FFIType.i32,
  },
  ntg_mute: {
    args: [FFIType.ptr, FFIType.i64, FFIType.ptr],
    returns: FFIType.i32,
  },
  ntg_unmute: {
    args: [FFIType.ptr, FFIType.i64, FFIType.ptr],
    returns: FFIType.i32,
  },
  ntg_stop: {
    args: [FFIType.ptr, FFIType.i64, FFIType.ptr],
    returns: FFIType.i32,
  },

  // ── Event registration (callback is a JSCallback.ptr passed as ptr) ──────
  ntg_on_stream_end: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr],
    returns: FFIType.i32,
  },
  ntg_on_connection_change: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr],
    returns: FFIType.i32,
  },
});

export default lib;

// ── Struct constants ─────────────────────────────────────────────────────────

export const ASYNC_STRUCT_SIZE = 32;

export const AUDIO_DESC_SIZE = 24;
export const AUDIO_DESC = {
  mediaSource: { offset: 0, size: 4 }, // i32
  // 4 bytes padding at offset 4
  input: { offset: 8, size: 8 }, // ptr (char*)
  sampleRate: { offset: 16, size: 4 }, // u32
  channelCount: { offset: 20, size: 1 }, // u8
  keepOpen: { offset: 21, size: 1 }, // bool
} as const;

export const MEDIA_DESC_SIZE = 32;
export const MEDIA_DESC = {
  microphone: { offset: 0 }, // ptr
  speaker: { offset: 8 }, // ptr (null)
  camera: { offset: 16 }, // ptr (null)
  screen: { offset: 24 }, // ptr (null)
} as const;

// ── Enum values ──────────────────────────────────────────────────────────────

export const NTG_MEDIA_SOURCE = {
  FILE: 1,
  SHELL: 2,
  FFMPEG: 4,
  DEVICE: 8,
  DESKTOP: 16,
  EXTERNAL: 32,
} as const;

export const NTG_STREAM_MODE = {
  CAPTURE: 0,
  PLAYBACK: 1,
} as const;

export const NTG_STREAM_TYPE = {
  AUDIO: 0,
  VIDEO: 1,
} as const;

export const NTG_STREAM_DEVICE = {
  MICROPHONE: 0,
  SPEAKER: 1,
  CAMERA: 2,
  SCREEN: 3,
} as const;
