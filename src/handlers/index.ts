import type { Client, Context } from "@mtkruto/node";
import controls from "./controls";
import help from "./help";
import jiosaavn from "./jiosaavn";
import leave from "./leave";
import play from "./play";
import queue from "./queue";
import radio from "./radio";
import start from "./start";
import youtube from "./youtube";

export function initHandlers(bot: Client<Context>): void {
  bot.use(start);
  bot.use(jiosaavn);
  bot.use(youtube);
  bot.use(radio);
  bot.use(play);
  bot.use(controls);
  bot.use(queue);
  bot.use(help);
  bot.use(leave);
}
