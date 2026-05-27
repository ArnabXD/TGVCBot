export class NtgCalls {
  constructor();
  
  on_stream_end(cb: (chatId: number) => void): void;
  
  on_connection_change(
    cb: (chatId: number, kind: number, state: number) => void
  ): void;
  
  create(chatId: number): Promise<string>;
  
  connect(
    chatId: number,
    params: string,
    isPresentation?: boolean
  ): Promise<void>;
  
  set_audio_source(chatId: number, ffmpegCmd: string): Promise<void>;
  
  pause(chatId: number): Promise<void>;
  
  resume(chatId: number): Promise<void>;
  
  mute(chatId: number): Promise<void>;
  
  unmute(chatId: number): Promise<void>;
  
  stop(chatId: number): Promise<void>;
}
