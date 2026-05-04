import type { Job } from "bullmq";
import { Source } from "@prisma/client";
import type { InboundEventJobPayload } from "../inbound-event.queue.js";
import { logger } from "../../../lib/logger.js";
import { inboundEventRepository } from "../../inbound_events/inbound-event.repository.js";
import type { NormalizedInboundPayload } from "../../webhooks/webhook.types.js";
import { processWhatsAppInbound } from "../../whatsapp/whatsapp-flow.processor.js";

export async function processInboundEventJob(job: Job<InboundEventJobPayload>): Promise<void> {
  const { inboundEventId, tenantId, source } = job.data;

  const event = await inboundEventRepository.findByIdForTenant(tenantId, inboundEventId);
  if (!event) {
    logger.error({ inboundEventId, tenantId }, "inbound_worker_event_missing");
    return;
  }

  if (event.status === "PROCESSED") {
    logger.info({ inboundEventId, tenantId }, "inbound_worker_already_processed");
    return;
  }

  if (event.status === "DUPLICATE") {
    logger.info({ inboundEventId, tenantId }, "inbound_worker_duplicate_state_skip");
    return;
  }

  await inboundEventRepository.updateStatusUnchecked(tenantId, inboundEventId, "PROCESSING");

  try {
    const normalized: NormalizedInboundPayload = {
      source,
      externalId: event.externalEventId,
      customer: null,
      items: [],
      raw: event.payload,
    };

    logger.info(
      {
        inboundEventId,
        tenantId,
        source: normalized.source,
        externalId: normalized.externalId,
        items: normalized.items.length,
      },
      "inbound_worker_normalized",
    );

    if (source === Source.WHATSAPP) {
      await processWhatsAppInbound({
        tenantId,
        inboundEventId,
        payload: event.payload,
      });
      logger.info({ inboundEventId, tenantId }, "whatsapp_flow_processed");
    }

    await inboundEventRepository.updateStatusUnchecked(tenantId, inboundEventId, "PROCESSED", {
      processedAt: new Date(),
      errorMessage: null,
    });

    logger.info({ inboundEventId, tenantId, source }, "inbound_worker_processed");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await inboundEventRepository.updateStatusUnchecked(tenantId, inboundEventId, "FAILED", {
      errorMessage: message,
      processedAt: new Date(),
    });
    logger.error({ inboundEventId, tenantId, err }, "inbound_worker_failed");
    throw err;
  }
}
