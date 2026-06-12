import EventEmitter from "node:events";
import {
  type MediaDescription,
  NtgCalls,
  register_logger,
} from "@arnabxd/ntgcalls-napi";
import { consola } from "consola";
import env from "../env";
import { VIDEO_FPS, VIDEO_HEIGHT, VIDEO_WIDTH } from "../ffmpeg";

const logger = consola.withTag("ntgcalls");

// ntgcalls log levels are bitmask: DEBUG=1, INFO=2, WARNING=4, ERROR=8, UNKNOWN=-1
const LogLevel = { DEBUG: 1, INFO: 2, WARNING: 4, ERROR: 8 } as const;

const nativeLogger = consola.withTag("ntgcalls:native");

// Per native level: severity rank (for threshold filtering) + consola method.
const logLevelMap = new Map<
  number,
  { rank: number; log: (msg: string) => void }
>([
  [LogLevel.DEBUG, { rank: 1, log: (msg) => nativeLogger.debug(msg) }],
  [LogLevel.INFO, { rank: 2, log: (msg) => nativeLogger.info(msg) }],
  [LogLevel.WARNING, { rank: 3, log: (msg) => nativeLogger.warn(msg) }],
  [LogLevel.ERROR, { rank: 4, log: (msg) => nativeLogger.error(msg) }],
]);

// Minimum rank to emit, derived from NTGCALLS_LOG_LEVEL. silent drops everything.
const minRank: Record<string, number> = {
  silent: Number.POSITIVE_INFINITY,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};
const ntgcallsMinRank = minRank[env.NTGCALLS_LOG_LEVEL] ?? 4;

register_logger(({ level, file, line, message }) => {
  const entry = logLevelMap.get(level);
  // Unknown levels (e.g. -1) always pass through so we never swallow surprises.
  const rank = entry?.rank ?? Number.POSITIVE_INFINITY;
  if (rank < ntgcallsMinRank) return;
  const log = entry?.log ?? ((msg) => nativeLogger.log(msg));
  log(`[${file}:${line}] ${message}`);
});

const StreamType = { Audio: 0, Video: 1 } as const;

// ntgcalls enum values (mirrors what the binding's set_audio_source helper
// uses internally — see ntgcalls-napi src/session.rs):
//   MediaSource.Shell = 2 — ntgcalls spawns the given shell command and reads
//   raw media from its stdout.
//   StreamMode.Capture = 0 — we are sending media into the call.
const MEDIA_SOURCE_SHELL = 2;
const STREAM_MODE_CAPTURE = 0;

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

  /**
   * Replace the outgoing media sources for a chat — audio always, video
   * optionally. Passing no videoCmd removes any active video track.
   *
   * The video ffmpeg command must produce rawvideo yuv420p frames of exactly
   * VIDEO_WIDTH×VIDEO_HEIGHT at VIDEO_FPS (use buildFfmpegVideoCmd), since
   * those dimensions are declared to ntgcalls here.
   */
  async setStreamSources(
    chatId: number,
    audioCmd: string,
    videoCmd?: string,
  ): Promise<void> {
    const desc: MediaDescription = {
      microphone: {
        mediaSource: MEDIA_SOURCE_SHELL,
        input: audioCmd,
        sampleRate: 48000,
        channelCount: 1,
        keepOpen: false,
      },
      camera: videoCmd
        ? {
            mediaSource: MEDIA_SOURCE_SHELL,
            input: videoCmd,
            width: VIDEO_WIDTH,
            height: VIDEO_HEIGHT,
            fps: VIDEO_FPS,
            keepOpen: false,
          }
        : undefined,
    };
    return this.native.set_stream_sources(chatId, STREAM_MODE_CAPTURE, desc);
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
