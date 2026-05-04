import { Worker } from "bullmq";
import { env } from "../../config/env.js";
import { createRedisConnection } from "./redis-connection.js";
import { DEFAULT_QUEUE_NAME, type FoundationJobPayload } from "./default.queue.js";
import { processDefaultJob } from "./processors/default.processor.js";
import { logger } from "../../lib/logger.js";

export function createDefaultWorker(): Worker {
  const connection = createRedisConnection();

  const worker = new Worker<FoundationJobPayload>(
    DEFAULT_QUEUE_NAME,
    async (job) => {
      await processDefaultJob(job);
    },
    { connection, prefix: env.QUEUE_PREFIX },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "job_failed");
  });

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "job_completed");
  });

  return worker;
}
