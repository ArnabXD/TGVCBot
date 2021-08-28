/**
 * Copyright 2021  Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import bot from '../bot';
import start from './start';
import jiosaavn from './jiosaavn';
import youtube from './youtube';
import play from './play';
import controls from './controls';
import queue from './queue';
import help from './help';

export const InitHandlers = (): void => {
  bot.use(start);
  bot.use(jiosaavn);
  bot.use(youtube);
  bot.use(play);
  bot.use(controls);
  bot.use(queue);
  bot.use(help);
};
