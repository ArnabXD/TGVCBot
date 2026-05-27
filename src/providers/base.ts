import type { QueueData } from "../queue";

export interface RequestedBy {
  id: number;
  first_name: string;
}

export default abstract class StreamProvider {
  constructor(readonly provider: QueueData["provider"]) {}

  abstract search(key: string): Promise<unknown>;

  abstract getSong(id: string, from: RequestedBy): Promise<QueueData>;
}
