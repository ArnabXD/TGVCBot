/**
 * Copyright 2021  Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import bot from '../bot';
import controls from './controls';
import help from './help';
import jiosaavn from './jiosaavn';
import leave from './leave';
import play from './play';
import queue from './queue';
import radio from './radio';
import start from './start';

export const InitHandlers = (): void => {
  bot.use(start);
  bot.use(jiosaavn);
  bot.use(radio);
  bot.use(play);
  bot.use(controls);
  bot.use(queue);
  bot.use(help);
  bot.use(leave);
};
