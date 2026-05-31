import EventEmitter from "node:events";
import { NtgCalls as NativeNtgCalls } from "@arnabxd/ntgcalls-napi";
import { consola } from "consola";

const logger = consola.withTag("ntgcalls");

export class NTgCalls extends EventEmitter {
  private readonly native: NativeNtgCalls;

  constructor() {
    super();
    this.native = new NativeNtgCalls();

    // Register callbacks from the native thread safely
    this.native.on_stream_end((chatId: bigint) => {
      logger.debug(`Stream ended for chatId=${chatId}`);
      this.emit("stream-end", chatId);
    });

    this.native.on_connection_change(
      (chatId: bigint, kind: number, state: number) => {
        logger.debug(
          `Connection change for chatId=${chatId} — kind=${kind} state=${state}`,
        );
        this.emit("connection-change", chatId, { kind, state });
      },
    );
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

  destroy(): void {
    // Native resources are safely cleaned up by Rust's Drop trait implementation
  }
}

export const ntgCalls = new NTgCalls();
