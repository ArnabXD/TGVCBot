import EventEmitter from "node:events";
import { NtgCalls } from "@arnabxd/ntgcalls-napi";
import { consola } from "consola";

const logger = consola.withTag("ntgcalls");

const StreamType = { Audio: 0, Video: 1 } as const;

export class NTgCalls extends EventEmitter {
  private readonly native: NtgCalls;

  constructor() {
    super();
    this.native = new NtgCalls();

    this.native.on("stream-end", (chatId, streamType, streamDevice) => {
      const id = Number(chatId);
      logger.debug(
        `Stream ended for chatId=${id} — type=${streamType} device=${streamDevice}`,
      );
      if (streamType !== StreamType.Audio) return;
      this.emit("stream-end", id, streamType, streamDevice);
    });

    this.native.on("connection-change", (chatId, kind, state) => {
      const id = Number(chatId);
      logger.debug(
        `Connection change for chatId=${id} — kind=${kind} state=${state}`,
      );
      this.emit("connection-change", id, kind, state);
    });
  }

  /**
   * Resolves when the WebRTC connection reaches Connected state.
   * Rejects immediately on hard failures (Failed/Closed).
   * For StreamConnection mode (Telegram group VCs), Connected fires after
   * Telegram grants can_self_unmute (~1-2s post-join). Times out after
   * `timeoutMs` ms and resolves anyway so audio can still be attempted —
   * a timeout here means StreamConnection mode where Connected fires late;
   * hard failures reject immediately so callers don't silently eat errors.
   */
  waitForConnected(chatId: number, timeoutMs = 15_000): Promise<void> {
    // ntg_connection_state_enum: 0=Connecting, 1=Connected, 2=Timeout, 3=Failed, 4=Closed
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off("connection-change", handler);
        logger.warn(
          `[${chatId}] waitForConnected timed out — proceeding anyway (StreamConnection mode)`,
        );
        resolve();
      }, timeoutMs);

      const handler = (id: number, _kind: number, state: number) => {
        if (id !== chatId) return;
        if (state === 1) {
          clearTimeout(timer);
          this.off("connection-change", handler);
          resolve();
        } else if (state === 3 || state === 4) {
          clearTimeout(timer);
          this.off("connection-change", handler);
          reject(
            new Error(
              `WebRTC connection failed (state=${state}) for chatId=${chatId}`,
            ),
          );
        }
      };

      this.on("connection-change", handler);
    });
  }

  async create(chatId: number): Promise<string> {
    return this.native.create(chatId);
  }

  async connect(
    chatId: number,
    params: string,
    isPresentation = false,
  ): Promise<void> {
    return this.native.connect(chatId, params, isPresentation);
  }

  async setAudioSource(chatId: number, ffmpegCmd: string): Promise<void> {
    return this.native.set_audio_source(chatId, ffmpegCmd);
  }

  async pause(chatId: number): Promise<void> {
    return this.native.pause(chatId);
  }

  async resume(chatId: number): Promise<void> {
    return this.native.resume(chatId);
  }

  async mute(chatId: number): Promise<void> {
    return this.native.mute(chatId);
  }

  async unmute(chatId: number): Promise<void> {
    return this.native.unmute(chatId);
  }

  async stop(chatId: number): Promise<void> {
    return this.native.stop(chatId);
  }
}

export const ntgCalls = new NTgCalls();