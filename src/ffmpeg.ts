import { spawn } from 'child_process';

const args = "-c:a libopus -b:a 320K -acodec pcm_s16le -f s16le -ac 1 -ar 65000 pipe:1"

export const ffmpeg = (input: string) => {
    return spawn("ffmpeg", ["-y", "-nostdin", "-i", `${input}`, ...args.split(' ')]).stdout
}