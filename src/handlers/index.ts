/**
 * Copyright 2021  Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
*/

import bot from '../bot';
import { Start } from './start';
import { JioSaavnPlay } from './jiosaavn';
import { YTPlay } from './youtube';
import { Play } from './play';
import { Pause, Resume, Skip, Stop } from './controls';
import { QueueList } from './queue';

export const InitHandlers = (): void => {
    bot.use(Start);
    bot.use(JioSaavnPlay);
    bot.use(YTPlay);
    bot.use(Play);
    bot.use(Pause);
    bot.use(Resume);
    bot.use(Skip);
    bot.use(Stop);
    bot.use(QueueList);
}