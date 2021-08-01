import { Logger } from './logger';
import bot from '../bot';

export const InitMiddleWares = (): void => {
    bot.use(Logger);
}