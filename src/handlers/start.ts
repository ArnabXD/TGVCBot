import { Composer, Markup } from 'telegraf';
import { escape } from 'html-escaper';

export const Start = Composer.command('start', async (ctx) => {
    let text =
        `Hi <a href="tg://user?id=${ctx.from.id}">${escape(ctx.from.first_name + " " + ctx.from.last_name)}</a>\n` +
        `I Play Songs in Group Voice Chats.\n` +
        `If you like this bot consider adding a star to the <a href="https://github.com/ArnabXD/TGVCBot">repository</a>`
    await ctx.replyWithHTML(text, {
        ...Markup.inlineKeyboard([
            [Markup.button.url('View Source', 'https://github.com/ArnabXD/TGVCBot')]
        ]),
        disable_web_page_preview: true
    })
})