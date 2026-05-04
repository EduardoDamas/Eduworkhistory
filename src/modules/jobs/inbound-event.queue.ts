import { Queue } from "bullmq";
import { env } from "../../config/env.js";
import { createRedisConnection } from "./redis-connection.js";
import type { Source } from "@prisma/client";

export const INBOUND_EVENTS_QUEUE_NAME = "inbound-events";

export type InboundEventJobPayload = {
  inboundEventId: string;
  tenantId: string;
  source: Source;
};

let queue: Queue<InboundEventJobPayload> | null = null;

export class InboundEnqueueError extends Error {
  constructor(cause: unknown) {
    super("Failed to enqueue inbound event job", { cause: cause instanceof Error ? cause : undefined });
    this.name = "InboundEnqueueError";
  }
}

export function getInboundEventsQueue(): Queue<InboundEventJobPayload> {
  if (!queue) {
    queue = new Queue<InboundEventJobPayload>(INBOUND_EVENTS_QUEUE_NAME, {
      connection: createRedisConnection(),
      prefix: env.QUEUE_PREFIX,
    });
  }
  return queue;
}

/** BullMQ custom jobId must not contain `:`. Uses UUIDs + enum-safe source only. */
export function buildInboundEventJobId(payload: InboundEventJobPayload): string {
  return `inbound_${payload.tenantId}_${payload.source}_${payload.inboundEventId}`;
}

export async function enqueueInboundEventJob(payload: InboundEventJobPayload): Promise<void> {
  const q = getInboundEventsQueue();
  await q.add(
    "process-inbound-event",
    payload,
    {
      jobId: buildInboundEventJobId(payload),
      removeOnComplete: 5000,
      removeOnFail: 10000,
      attempts: 8,
      backoff: { type: "exponential", delay: 3000 },
    },
  );
}
