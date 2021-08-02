import { ErrorHandler } from './errorHandler';
import bot from '../bot';

export const InitMiddleWares = (): void => {
    bot.use(ErrorHandler);
}