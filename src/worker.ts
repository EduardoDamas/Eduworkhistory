import { createDefaultWorker } from "./modules/jobs/default.worker.js";
import { createInboundEventWorker } from "./modules/jobs/inbound-event.worker.js";
import { INBOUND_EVENTS_QUEUE_NAME } from "./modules/jobs/inbound-event.queue.js";
import { createLegacyExportWorker } from "./modules/legacy_connectors/legacy-export.worker.js";
import { LEGACY_EXPORT_QUEUE_NAME } from "./modules/legacy_connectors/legacy-export.queue.js";
import { logger } from "./lib/logger.js";

const defaultWorker = createDefaultWorker();
const inboundWorker = createInboundEventWorker();
const legacyExportWorker = createLegacyExportWorker();

logger.info({ queues: ["default", INBOUND_EVENTS_QUEUE_NAME, LEGACY_EXPORT_QUEUE_NAME] }, "worker_started");

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "worker_shutting_down");
  await Promise.all([defaultWorker.close(), inboundWorker.close(), legacyExportWorker.close()]);
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
