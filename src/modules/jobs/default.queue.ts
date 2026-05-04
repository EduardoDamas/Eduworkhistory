import { Queue } from "bullmq";
import { env } from "../../config/env.js";
import { createRedisConnection } from "./redis-connection.js";

export const DEFAULT_QUEUE_NAME = "default";

let queue: Queue | null = null;

export function getDefaultQueue(): Queue {
  if (!queue) {
    queue = new Queue(DEFAULT_QUEUE_NAME, {
      connection: createRedisConnection(),
      prefix: env.QUEUE_PREFIX,
    });
  }
  return queue;
}

export type FoundationJobPayload = {
  kind: string;
  tenantId: string;
  orderId?: string;
};

export async function enqueueFoundationJob(payload: FoundationJobPayload): Promise<void> {
  const q = getDefaultQueue();
  await q.add("foundation", payload, {
    removeOnComplete: 1000,
    removeOnFail: 5000,
    attempts: 5,
    backoff: { type: "exponential", delay: 2000 },
  });
}
