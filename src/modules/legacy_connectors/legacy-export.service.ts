import { createHash } from "node:crypto";
import { LegacyConnectionSource, type LegacyExportSource, Prisma } from "@prisma/client";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { comandaRepository } from "../comanda/comanda.repository.js";
import { legacyOrderMapper } from "../legacy_integrations/legacy-order.mapper.js";
import { firebirdConnector } from "./connectors/firebird.connector.js";
import { mockLegacyConnector } from "./connectors/mock.connector.js";
import { mssqlConnector } from "./connectors/mssql.connector.js";
import { legacyConfigRepository } from "./legacy-config.repository.js";
import { legacyExportAttemptRepository } from "./legacy-export-attempt.repository.js";
import { enqueueLegacyExportRetryJob } from "./legacy-export.queue.js";
import type { ExportOrderInput, RetryAttemptInput, ExportProcessResult, LegacyExportMode } from "./legacy-connector.types.js";

export const legacyExportService = {
  async exportOrder(input: ExportOrderInput): Promise<ExportProcessResult[]> {
    const payload = await legacyOrderMapper.mapOrder(input.orderId, input.tenantId);
    const sources = resolveSources(payload.items.map((i) => i.externalSource));
    const results: ExportProcessResult[] = [];
    for (const source of sources) {
      const result = await processSourceExport({
        tenantId: input.tenantId,
        orderId: input.orderId,
        source,
        payload,
      });
      results.push(result);
    }
    return results;
  },

  async retryAttempt(input: RetryAttemptInput): Promise<ExportProcessResult> {
    const row = await legacyExportAttemptRepository.findById(input.tenantId, input.attemptId);
    if (!row) throw new Error("LEGACY_ATTEMPT_NOT_FOUND");
    return processSourceExport({
      tenantId: input.tenantId,
      orderId: input.orderId,
      source: input.source,
      payload: row.payload,
      existingAttemptId: row.id,
    });
  },

  listAttempts(tenantId: string) {
    return legacyExportAttemptRepository.listByTenant(tenantId);
  },

  async getAttempt(tenantId: string, id: string) {
    const row = await legacyExportAttemptRepository.findById(tenantId, id);
    if (!row) throw new Error("LEGACY_ATTEMPT_NOT_FOUND");
    return row;
  },

  async enqueueManualRetry(tenantId: string, attemptId: string) {
    const row = await legacyExportAttemptRepository.findById(tenantId, attemptId);
    if (!row) throw new Error("LEGACY_ATTEMPT_NOT_FOUND");
    await enqueueLegacyExportRetryJob({
      attemptId: row.id,
      tenantId,
      orderId: row.orderId,
      source: row.source,
    });
    return row;
  },
};

async function processSourceExport(input: {
  tenantId: string;
  orderId: string;
  source: LegacyExportSource;
  payload: unknown;
  existingAttemptId?: string;
}): Promise<ExportProcessResult> {
  const payloadJson = toJsonValue(input.payload);
  const idempotencyKey = buildIdempotencyKey(input.tenantId, input.orderId, input.source, payloadJson);
  const existing = await legacyExportAttemptRepository.findByTenantOrderSource(
    input.tenantId,
    input.orderId,
    input.source,
  );
  if (existing?.status === "SUCCESS") {
    logger.info({ tenantId: input.tenantId, orderId: input.orderId, source: input.source }, "legacy_export_skipped_already_success");
    await comandaRepository.createIntegrationLog({
      tenantId: input.tenantId,
      action: "legacy_export_skipped_already_success",
      entityType: "order",
      entityId: input.orderId,
      payload: { source: input.source, idempotencyKey },
      status: "SUCCESS",
    });
    return { attempt: existing, scheduledRetry: false, skippedAlreadySuccess: true };
  }

  const attempt = await legacyExportAttemptRepository.createOrUpdatePending({
    tenantId: input.tenantId,
    orderId: input.orderId,
    source: input.source,
    idempotencyKey,
    payload: payloadJson,
  });
  logger.info({ tenantId: input.tenantId, orderId: input.orderId, source: input.source, attemptId: attempt.id }, "legacy_export_attempt_created");

  const mode = resolveMode();
  try {
    const connectorResult = await dispatchConnector(input.tenantId, input.source, mode, input.payload);
    if (connectorResult.response?.alreadyExists === true) {
      logger.info(
        { attemptId: attempt.id, source: input.source, orderId: input.orderId },
        "legacy_export_remote_idempotent_hit",
      );
    }
    const updated = await legacyExportAttemptRepository.markSuccess(attempt.id, toJsonValue(connectorResult.response));
    logger.info({ attemptId: attempt.id, source: input.source, mode }, "legacy_export_success");
    await comandaRepository.createIntegrationLog({
      tenantId: input.tenantId,
      action: "legacy_order_export_success",
      entityType: "order",
      entityId: input.orderId,
      payload: { source: input.source, idempotencyKey, mode },
      result: toJsonValue(connectorResult.response),
      status: "SUCCESS",
    });
    return { attempt: updated, scheduledRetry: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : "legacy_export_failed";
    const canRetry = attempt.attemptCount + 1 < env.LEGACY_EXPORT_RETRY_ATTEMPTS;
    const updated = canRetry
      ? await legacyExportAttemptRepository.markRetrying(attempt.id, message)
      : await legacyExportAttemptRepository.markFailed(attempt.id, message, "FAILED");
    logger.error({ err, attemptId: attempt.id, source: input.source }, "legacy_export_failed");
    await comandaRepository.createIntegrationLog({
      tenantId: input.tenantId,
      action: "legacy_order_export_failed",
      entityType: "order",
      entityId: input.orderId,
      payload: { source: input.source, idempotencyKey, mode },
      status: "ERROR",
      errorMessage: message,
    });

    if (canRetry) {
      await enqueueLegacyExportRetryJob({
        attemptId: attempt.id,
        tenantId: input.tenantId,
        orderId: input.orderId,
        source: input.source,
      });
      logger.warn({ attemptId: attempt.id, source: input.source }, "legacy_export_retry_scheduled");
      await comandaRepository.createIntegrationLog({
        tenantId: input.tenantId,
        action: "legacy_export_retry_scheduled",
        entityType: "order",
        entityId: input.orderId,
        payload: { source: input.source, attemptId: attempt.id },
        status: "SUCCESS",
      });
      return { attempt: updated, scheduledRetry: true };
    }

    return { attempt: updated, scheduledRetry: false };
  }
}

async function dispatchConnector(
  tenantId: string,
  source: LegacyExportSource,
  mode: LegacyExportMode,
  payload: unknown,
) {
  const castPayload = payload as Parameters<typeof mockLegacyConnector.sendOrder>[0]["payload"];
  if (mode === "mock" || source === "MOCK") {
    return mockLegacyConnector.sendOrder({ payload: castPayload, config: null, mode: "mock" });
  }

  const connectionSource = source === "FIREBIRD" ? LegacyConnectionSource.FIREBIRD : LegacyConnectionSource.MSSQL;
  const config = await legacyConfigRepository.findEnabledByTenantAndSource(tenantId, connectionSource);
  if (!config) throw new Error("LEGACY_CONFIG_MISSING_OR_DISABLED");

  if (mode === "dry-run" || config.dryRun) {
    return {
      ok: true,
      source,
      dryRun: true,
      response: { message: "Legacy dry-run mode", source, orderId: castPayload.orderId },
    };
  }

  if (source === "FIREBIRD") {
    return firebirdConnector.sendOrder({ payload: castPayload, config, mode: "live" });
  }
  return mssqlConnector.sendOrder({ payload: castPayload, config, mode: "live" });
}

function resolveSources(externalSources: string[]): LegacyExportSource[] {
  const set = new Set<LegacyExportSource>();
  for (const src of externalSources) {
    if (src === "FIREBIRD" || src === "MSSQL") set.add(src);
  }
  if (set.size === 0) set.add("MOCK");
  return Array.from(set);
}

function resolveMode(): LegacyExportMode {
  if (env.LEGACY_EXPORT_MODE === "live") return "live";
  if (env.LEGACY_EXPORT_MODE === "dry-run") return "dry-run";
  return "mock";
}

function buildIdempotencyKey(
  tenantId: string,
  orderId: string,
  source: LegacyExportSource,
  payload: Prisma.InputJsonValue,
): string {
  const raw = JSON.stringify({ tenantId, orderId, source, payload });
  return createHash("sha256").update(raw).digest("hex");
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value === null ? "null" : value;
  }
  if (Array.isArray(value)) return value.map((v) => toJsonValue(v));
  if (typeof value === "object") {
    const out: Record<string, Prisma.InputJsonValue> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = toJsonValue(v);
    return out;
  }
  return String(value);
}
