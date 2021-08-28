export interface Ytmp3 {
  result: boolean;
  audio: Audio[];
}

export interface Audio {
  itag: number;
  mimeType: string;
  bitrate: number;
  initRange: Range;
  indexRange: Range;
  lastModified: string;
  contentLength: string;
  quality: string;
  projectionType: string;
  averageBitrate: number;
  highReplication?: boolean;
  audioQuality: string;
  approxDurationMs: string;
  audioSampleRate: string;
  audioChannels: number;
  loudnessDb: number;
  s: string;
  sp: string;
  url: string;
}

export interface Range {
  start: string;
  end: string;
}
