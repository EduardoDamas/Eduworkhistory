import { Worker } from "bullmq";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { createRedisConnection } from "../jobs/redis-connection.js";
import { legacyExportService } from "./legacy-export.service.js";
import { LEGACY_EXPORT_QUEUE_NAME, type LegacyExportJobPayload } from "./legacy-export.queue.js";

export function createLegacyExportWorker(): Worker<LegacyExportJobPayload> {
  const worker = new Worker<LegacyExportJobPayload>(
    LEGACY_EXPORT_QUEUE_NAME,
    async (job) => {
      await legacyExportService.retryAttempt(job.data);
    },
    {
      connection: createRedisConnection(),
      prefix: env.QUEUE_PREFIX,
      concurrency: 5,
    },
  );

  worker.on("failed", (job, err) => {
    logger.error({ err, jobId: job?.id, queue: LEGACY_EXPORT_QUEUE_NAME }, "legacy_export_job_failed");
  });

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, queue: LEGACY_EXPORT_QUEUE_NAME }, "legacy_export_job_completed");
  });

  return worker;
}
