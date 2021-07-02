import { bot, log } from './bot';
import { InitMiddleWares } from './middlewares';
import { InitHandlers } from './handlers';
import { startUserBot } from './userbot';
import { connections } from './tgcalls';

(async () => {
    InitMiddleWares();
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
    await connections.closeAll();
})