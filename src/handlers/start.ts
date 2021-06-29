import { Composer } from 'telegraf';

export const Start = Composer.command('start', async (ctx) => {
    ctx.replyWithHTML("Hi There")
})