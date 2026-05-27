/**
 * ntg_async_struct promise bridge.
 *
 * ntg_async_struct layout (32 bytes):
 *   [0]  void*              userData      — we store our numeric token here
 *   [8]  int*               errorCode     — pointer to Int32Array[1]
 *   [16] char**             errorMessage  — pointer to BigUint64Array[1]
 *   [24] ntg_async_callback promise       — JSCallback.ptr
 *
 * When C finishes the async op it calls: promise(userData)
 * We look up the token in _pending, read errorCode, resolve or reject.
 *
 * JSCallback uses { threadsafe: true } because NTgCalls fires callbacks
 * from its own C++ threads, not the JS thread.
 */

import { CString, JSCallback, type Pointer, ptr } from "bun:ffi";
import { ASYNC_STRUCT_SIZE } from "./ffi";

// ── Per-call pending state ────────────────────────────────────────────────────

interface Pending {
  resolve: () => void;
  reject: (e: Error) => void;
  errorCodeBuf: Int32Array; // C writes the error code here
  errorMsgPtrBuf: BigUint64Array; // C writes a char* here (pointer to msg string)
}

const pending = new Map<number, Pending>();
let nextToken = 1;

// ── Shared C-callable callback ────────────────────────────────────────────────
// Signature: void callback(void* userData)
// userData is our numeric token — arrives as Pointer (branded number) in JS.

const asyncCallback = new JSCallback(
  (userDataPtr: Pointer) => {
    const token = userDataPtr as unknown as number;
    const entry = pending.get(token);
    if (!entry) return;
    pending.delete(token);

    const code = entry.errorCodeBuf[0]!;
    if (code === 0) {
      entry.resolve();
    } else {
      const msgRawPtr = entry.errorMsgPtrBuf[0]!;
      let message = `NTgCalls error ${code}`;
      if (msgRawPtr !== 0n) {
        try {
          message = new CString(msgRawPtr as unknown as Pointer).toString();
        } catch {
          /* keep default */
        }
      }
      entry.reject(new Error(message));
    }
  },
  {
    args: ["ptr"], // void* userData — arrives as Pointer in the callback
    returns: "void",
    threadsafe: true, // NTgCalls fires this from C++ threads
  },
);

// ── Public API ────────────────────────────────────────────────────────────────

export interface AsyncStruct {
  /** Uint8Array holding the 32-byte ntg_async_struct — pass ptr(buf) to C */
  buf: Uint8Array;
  /** Resolves when C calls the callback with errorCode=0, rejects otherwise */
  promise: Promise<void>;
}

/**
 * Allocate a populated ntg_async_struct.
 * Keep a reference to `buf` until the promise settles (prevents GC).
 */
export function makeAsyncStruct(): AsyncStruct {
  const token = nextToken++;

  let resolve!: () => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  const errorCodeBuf = new Int32Array(1); // int*
  const errorMsgPtrBuf = new BigUint64Array(1); // char**

  pending.set(token, { resolve, reject, errorCodeBuf, errorMsgPtrBuf });

  // Build the 32-byte struct
  const buf = new Uint8Array(ASYNC_STRUCT_SIZE);
  const view = new DataView(buf.buffer);

  // [0]  userData  = token (small integer — safe as a pointer value)
  view.setBigUint64(0, BigInt(token), true);

  // [8]  errorCode*     = pointer to errorCodeBuf
  view.setBigUint64(8, BigInt(ptr(errorCodeBuf)), true);

  // [16] errorMessage** = pointer to errorMsgPtrBuf
  view.setBigUint64(16, BigInt(ptr(errorMsgPtrBuf)), true);

  // [24] promise fn     = JSCallback.ptr (non-null: we never call close on it)
  view.setBigUint64(24, BigInt(asyncCallback.ptr!), true);

  return { buf, promise };
}
