import type { Job } from "bullmq";
import type { FoundationJobPayload } from "../default.queue.js";
import { logger } from "../../../lib/logger.js";

/**
 * Empty processor scaffold — expand in later phases for order normalization,
 * comanda sync, retries, and idempotent side effects.
 */
export async function processDefaultJob(job: Job<FoundationJobPayload>): Promise<void> {
  logger.info({ jobId: job.id, name: job.name, data: job.data }, "job_received_noop");
}
