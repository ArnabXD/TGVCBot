import { spawn } from 'child_process';
import env from './env';

const args = `${env.CODEC} -acodec pcm_s16le -f s16le -ac 1 -ar 65000 pipe:1`

export const ffmpeg = (input: string) => {
    return spawn("ffmpeg", ["-y", "-nostdin", "-i", `${input}`, ...args.split(/\s/g)]).stdout
}