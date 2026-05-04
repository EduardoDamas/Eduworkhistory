import { Queue } from "bullmq";
import type { LegacyExportSource } from "@prisma/client";
import { env } from "../../config/env.js";
import { createRedisConnection } from "../jobs/redis-connection.js";

export const LEGACY_EXPORT_QUEUE_NAME = "legacy-export";

export type LegacyExportJobPayload = {
  tenantId: string;
  orderId: string;
  source: LegacyExportSource;
  attemptId: string;
};

let queue: Queue<LegacyExportJobPayload> | null = null;

function getQueue() {
  if (!queue) {
    queue = new Queue<LegacyExportJobPayload>(LEGACY_EXPORT_QUEUE_NAME, {
      connection: createRedisConnection(),
      prefix: env.QUEUE_PREFIX,
    });
  }
  return queue;
}

export async function enqueueLegacyExportRetryJob(payload: LegacyExportJobPayload): Promise<void> {
  await getQueue().add("retry-legacy-export", payload, {
    jobId: `legacy_retry_${payload.tenantId}_${payload.source}_${payload.attemptId}`,
    attempts: env.LEGACY_EXPORT_RETRY_ATTEMPTS,
    backoff: { type: "exponential", delay: env.LEGACY_EXPORT_RETRY_BACKOFF_MS },
    removeOnComplete: 5000,
    removeOnFail: 10000,
  });
}
