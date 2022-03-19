import { QueueData } from '../queue';
import { User } from '@grammyjs/types';

export default abstract class StreamProvider<S> {
  constructor(readonly provider: QueueData['provider']) {}
  abstract search(key: string): Promise<S | undefined>;
  abstract getSong(id: string, from: User): Promise<QueueData>;
}
