import type { Prisma, Source } from "@prisma/client";
import { inboundEventRepository } from "./inbound-event.repository.js";
import { logger } from "../../lib/logger.js";
import { enqueueInboundEventJob, InboundEnqueueError } from "../jobs/inbound-event.queue.js";

export type IngestParams = {
  tenantId: string;
  source: Source;
  payload: unknown;
  externalEventId: string;
};

export const inboundEventService = {
  async ingest(params: IngestParams): Promise<{ duplicate: boolean; inboundEventId: string }> {
    const { tenantId, source, externalEventId } = params;
    const payload = params.payload as Prisma.InputJsonValue;

    try {
      const row = await inboundEventRepository.create({
        tenantId,
        source,
        externalEventId,
        payload,
        status: "RECEIVED",
      });

      logger.info(
        { inboundEventId: row.id, tenantId, source, externalEventId },
        "inbound_event_stored",
      );

      try {
        await enqueueInboundEventJob({
          inboundEventId: row.id,
          tenantId,
          source,
        });
        logger.info({ inboundEventId: row.id, tenantId, source }, "inbound_job_enqueued");
      } catch (err) {
        await inboundEventRepository.updateStatusUnchecked(tenantId, row.id, "FAILED", {
          errorMessage: `enqueue_failed: ${String(err)}`,
          processedAt: new Date(),
        });
        throw new InboundEnqueueError(err);
      }

      await inboundEventRepository.updateById(tenantId, row.id, { status: "QUEUED" });

      return { duplicate: false, inboundEventId: row.id };
    } catch (err) {
      if (isUniqueViolation(err)) {
        const existing = await inboundEventRepository.findByUnique(tenantId, source, externalEventId);
        if (!existing) {
          logger.error({ tenantId, source, externalEventId }, "inbound_duplicate_missing_row");
          throw err;
        }
        logger.warn(
          { inboundEventId: existing.id, tenantId, source, externalEventId },
          "inbound_event_duplicated",
        );
        return { duplicate: true, inboundEventId: existing.id };
      }
      throw err;
    }
  },
};

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002";
}
