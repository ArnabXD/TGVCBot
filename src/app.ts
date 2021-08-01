import bot, { log } from './bot';
import { startUserBot } from './userbot';
import { InitHandlers } from './handlers';

(async () => {
    InitHandlers();
    await bot.launch({
        dropPendingUpdates: true,
        allowedUpdates: ["message", "callback_query"]
    })
    await log("Bot is Running");
    await startUserBot();
})();

process.once('SIGINT', async () => {
    bot.stop('SIGINT');
})