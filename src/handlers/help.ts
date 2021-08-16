import { Composer } from 'telegraf';


const help: string =
    `*Commands Available :*\n\n` +
    `/jiosaavn or /jsvn : Play songs from JioSaavn\n` +
    `/youtube or /yt : Play songs from YouTube\n` +
    `/play : Reply this command to audio files to play the file\n` +
    `/queue or /q : Check queued songs list\n` +
    `/p : Pause the stream\n` +
    `/r : Resume the stream\n` +
    `/next or /skip : Skip the current song\n` +
    `/stopvc : Stop the stream\n` +
    `/help : Show this Menu`

export const Help = Composer.command('help', async ctx => {
    await ctx.replyWithMarkdownV2(help);
})