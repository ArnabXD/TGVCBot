import bot from '../bot';
import { Start } from './start';
import { JioSaavnPlay } from './jiosaavn';
import { YTPlay } from './youtube';
import { Pause, Resume, Skip, Stop } from './controls';
import { QueueList } from './queue';

export const InitHandlers = (): void => {
    bot.use(Start);
    bot.use(JioSaavnPlay);
    bot.use(YTPlay);
    bot.use(Pause);
    bot.use(Resume);
    bot.use(Skip);
    bot.use(Stop);
    bot.use(QueueList);
}