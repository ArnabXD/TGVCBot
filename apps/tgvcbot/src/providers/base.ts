/**
 * Copyright 2021 Arnab Paryali and the Contributors - https://github.com/ArnabXD/TGVCBot/graphs/contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { QueueData } from '../queue';
import { User } from '@grammyjs/types';

export default abstract class StreamProvider {
  constructor(readonly provider: QueueData['provider']) {}

  abstract search(key: string): Promise<unknown>;

  abstract getSong(id: string, from: User): Promise<QueueData>;
}
