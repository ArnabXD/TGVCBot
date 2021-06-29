import { Logger } from './logger';
import { isSuperGroup } from './isSuperGroup';
import { bot } from '../bot';

export const InitMiddleWares = (): void => {
    bot.use(Logger);
    bot.use(isSuperGroup);
}