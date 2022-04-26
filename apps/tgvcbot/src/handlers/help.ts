import { Composer } from 'grammy';

const composer = new Composer();

const help =
  `<b>Commands Available :</b>\n\n` +
  `/jiosaavn or /jsvn : Play songs from JioSaavn\n` +
  `/play : Reply this command to audio files to play the file\n` +
  `/queue or /q : Check queued songs list\n` +
  `/p : Pause the stream\n` +
  `/r : Resume the stream\n` +
  `/next or /skip : Skip the current song\n` +
  `/stopvc : Stop the stream\n` +
  `/leave : Leave VC (works if stream is finished but VC user not left)\n` +
  `/help : Show this Menu`;

composer.command('help', (ctx) => ctx.reply(help, { parse_mode: 'HTML' }));

export default composer;
