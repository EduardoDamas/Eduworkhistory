import { LegacyConnectionSource, Prisma } from "@prisma/client";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { pingFirebirdConnection } from "./connectors/firebird.connector.js";
import { pingMssqlConnection } from "./connectors/mssql.connector.js";
import { legacyConfigRepository } from "./legacy-config.repository.js";

export const legacyConfigService = {
  async create(tenantId: string, input: Record<string, unknown>) {
    const source = parseSource(input.source);
    if (!source) throw new Error("INVALID_LEGACY_SOURCE");
    const dryRun = typeof input.dryRun === "boolean" ? input.dryRun : true;
    const payload = normalizeConfigPayload(input, { requirePassword: !dryRun, dryRun });
    const row = await legacyConfigRepository.upsertConfig(tenantId, source, payload);
    return sanitize(row);
  },

  async list(tenantId: string) {
    const rows = await legacyConfigRepository.listByTenant(tenantId);
    return rows.map(sanitize);
  },

  async patch(tenantId: string, id: string, input: Record<string, unknown>) {
    const existing = await legacyConfigRepository.findById(tenantId, id);
    if (!existing) throw new Error("LEGACY_CONFIG_NOT_FOUND");

    const data: Prisma.LegacyConnectionConfigUpdateInput = {};
    if (typeof input.host === "string") data.host = input.host.trim();
    if (typeof input.port === "number") data.port = Math.trunc(input.port);
    if (typeof input.databaseName === "string") data.databaseName = input.databaseName.trim();
    if (typeof input.username === "string") data.username = input.username.trim();
    if (typeof input.password === "string" && input.password.length > 0) {
      data.password = input.password.trim();
    }
    if (typeof input.enabled === "boolean") data.enabled = input.enabled;
    if (typeof input.dryRun === "boolean") data.dryRun = input.dryRun;
    if (Object.prototype.hasOwnProperty.call(input, "options")) {
      if (input.options === null || typeof input.options !== "object" || Array.isArray(input.options)) {
        throw new Error("INVALID_LEGACY_OPTIONS");
      }
      data.options = input.options as Prisma.InputJsonValue;
    }
    if (Object.keys(data).length === 0) throw new Error("LEGACY_CONFIG_PATCH_EMPTY");

    const nextDryRun = typeof data.dryRun === "boolean" ? data.dryRun : existing.dryRun;
    const nextEnabled = typeof data.enabled === "boolean" ? data.enabled : existing.enabled;
    const nextHost = typeof data.host === "string" ? data.host : existing.host;
    const nextDb = typeof data.databaseName === "string" ? data.databaseName : existing.databaseName;
    const nextUser = typeof data.username === "string" ? data.username : existing.username;
    const nextPassword =
      typeof data.password === "string" ? data.password : existing.password;

    if (!nextDryRun && nextEnabled) {
      if (!nextHost?.trim()) throw new Error("LEGACY_CONFIG_HOST_REQUIRED");
      if (!nextDb?.trim()) throw new Error("LEGACY_CONFIG_DATABASE_REQUIRED");
      if (!nextUser?.trim()) throw new Error("LEGACY_CONFIG_USERNAME_REQUIRED");
      if (!nextPassword?.trim()) throw new Error("LEGACY_CONFIG_PASSWORD_REQUIRED");
    }

    const row = await legacyConfigRepository.patchById(tenantId, id, data);
    return sanitize(row);
  },

  async healthCheck(tenantId: string, configId: string) {
    const row = await legacyConfigRepository.findById(tenantId, configId);
    if (!row) throw new Error("LEGACY_CONFIG_NOT_FOUND");
    const started = Date.now();
    const mode = env.LEGACY_EXPORT_MODE;

    if (mode === "mock" || row.dryRun) {
      return {
        ok: true,
        simulated: true,
        source: row.source,
        latencyMs: Date.now() - started,
        mode,
        dryRun: row.dryRun,
      };
    }

    if (mode === "dry-run") {
      return {
        ok: true,
        simulated: true,
        source: row.source,
        latencyMs: Date.now() - started,
        mode: "dry-run",
      };
    }

    if (!row.enabled) {
      return {
        ok: false,
        simulated: false,
        reason: "config_disabled",
        source: row.source,
        latencyMs: Date.now() - started,
      };
    }

    if (!row.host?.trim() || !row.databaseName?.trim() || !row.username?.trim()) {
      return {
        ok: false,
        simulated: false,
        reason: "incomplete_connection_fields",
        source: row.source,
        latencyMs: Date.now() - started,
      };
    }

    const ping =
      row.source === "FIREBIRD" ? await pingFirebirdConnection(row) : await pingMssqlConnection(row);
    const latencyMs = Date.now() - started;
    logger.info({ tenantId, configId, source: row.source, ok: ping.ok, latencyMs }, "legacy_config_health_checked");
    return {
      ok: ping.ok,
      simulated: false,
      source: row.source,
      latencyMs,
      message: ping.message,
    };
  },
};

function parseSource(value: unknown): LegacyConnectionSource | null {
  if (typeof value !== "string") return null;
  return (Object.values(LegacyConnectionSource) as string[]).includes(value)
    ? (value as LegacyConnectionSource)
    : null;
}

function normalizeConfigPayload(
  input: Record<string, unknown>,
  opts: { requirePassword: boolean; dryRun: boolean },
) {
  const hostRaw = typeof input.host === "string" ? input.host.trim() : "";
  const port = typeof input.port === "number" ? Math.trunc(input.port) : 0;
  const databaseNameRaw = typeof input.databaseName === "string" ? input.databaseName.trim() : "";
  const usernameRaw = typeof input.username === "string" ? input.username.trim() : "";
  const password = typeof input.password === "string" ? input.password.trim() : "";

  if (!opts.dryRun) {
    if (!hostRaw) throw new Error("LEGACY_CONFIG_HOST_REQUIRED");
    if (!port || port <= 0) throw new Error("LEGACY_CONFIG_PORT_REQUIRED");
    if (!databaseNameRaw) throw new Error("LEGACY_CONFIG_DATABASE_REQUIRED");
    if (!usernameRaw) throw new Error("LEGACY_CONFIG_USERNAME_REQUIRED");
    if (opts.requirePassword && !password) throw new Error("LEGACY_CONFIG_PASSWORD_REQUIRED");
  }

  const host = hostRaw || "127.0.0.1";
  const databaseName = databaseNameRaw || "dry-run-not-configured";
  const username = usernameRaw || "dry-run";
  const resolvedPort = port > 0 ? port : 3050;

  if (input.options !== undefined && (input.options === null || typeof input.options !== "object" || Array.isArray(input.options))) {
    throw new Error("INVALID_LEGACY_OPTIONS");
  }

  return {
    host,
    port: resolvedPort,
    databaseName,
    username,
    password,
    options: (input.options as Prisma.InputJsonValue | undefined) ?? {},
    enabled: typeof input.enabled === "boolean" ? input.enabled : true,
    dryRun: opts.dryRun,
  };
}

function sanitize<T extends { password: string }>(row: T): Omit<T, "password"> & { passwordConfigured: boolean } {
  const { password, ...rest } = row;
  return { ...rest, passwordConfigured: Boolean(password?.trim()) };
}
