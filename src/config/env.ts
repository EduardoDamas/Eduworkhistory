import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 3000),
  DATABASE_URL: required("DATABASE_URL"),
  REDIS_URL: required("REDIS_URL"),
  LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
  QUEUE_PREFIX: process.env.QUEUE_PREFIX ?? "order-platform",
  WHATSAPP_SEND_MODE: process.env.WHATSAPP_SEND_MODE ?? "mock",
  WHATSAPP_GRAPH_API_VERSION: process.env.WHATSAPP_GRAPH_API_VERSION ?? "v20.0",
  WHATSAPP_REQUIRE_SIGNATURE: process.env.WHATSAPP_REQUIRE_SIGNATURE === "true",
  LEGACY_EXPORT_MODE: process.env.LEGACY_EXPORT_MODE ?? "mock",
  LEGACY_EXPORT_RETRY_ATTEMPTS: Number(process.env.LEGACY_EXPORT_RETRY_ATTEMPTS ?? 5),
  LEGACY_EXPORT_RETRY_BACKOFF_MS: Number(process.env.LEGACY_EXPORT_RETRY_BACKOFF_MS ?? 3000),
  /** DB connect / request timeout for legacy connectors (ms). */
  LEGACY_DB_TIMEOUT_MS: Number(process.env.LEGACY_DB_TIMEOUT_MS ?? 15000),
};
