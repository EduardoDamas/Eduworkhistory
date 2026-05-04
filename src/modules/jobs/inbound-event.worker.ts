import { Worker } from "bullmq";
import { env } from "../../config/env.js";
import { createRedisConnection } from "./redis-connection.js";
import { INBOUND_EVENTS_QUEUE_NAME, type InboundEventJobPayload } from "./inbound-event.queue.js";
import { processInboundEventJob } from "./processors/inbound-event.processor.js";
import { logger } from "../../lib/logger.js";

export function createInboundEventWorker(): Worker<InboundEventJobPayload> {
  const connection = createRedisConnection();

  const worker = new Worker<InboundEventJobPayload>(
    INBOUND_EVENTS_QUEUE_NAME,
    async (job) => {
      await processInboundEventJob(job);
    },
    { connection, prefix: env.QUEUE_PREFIX, concurrency: 10 },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, queue: INBOUND_EVENTS_QUEUE_NAME, err }, "inbound_job_failed");
  });

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, queue: INBOUND_EVENTS_QUEUE_NAME }, "inbound_job_completed");
  });

  return worker;
}
