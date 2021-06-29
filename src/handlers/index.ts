import { bot } from '../bot';
import { Start } from './start';
import { JioSaavn } from './jiosaavn';
import { QueueList } from './queue';
import { Pause, Resume, Skip, Stop } from './controls';

export const InitHandlers = (): void => {
    bot.use(Start);
    bot.use(JioSaavn);
    bot.use(QueueList);
    bot.use(Pause);
    bot.use(Resume);
    bot.use(Skip);
    bot.use(Stop);
}