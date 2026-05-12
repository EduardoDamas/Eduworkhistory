import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function bool(name: string, fallback = false): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return raw === "true";
}

function requiredWhenEnabled(enabled: boolean, name: string): string {
  const value = process.env[name] ?? "";
  if (enabled && !value) {
    throw new Error(`Missing required env var when feature is enabled: ${name}`);
  }
  return value;
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
  MARKETPLACE_TEST_MODE: bool("MARKETPLACE_TEST_MODE", true),

  IFOOD_ENABLED: bool("IFOOD_ENABLED", false),
  IFOOD_CLIENT_ID: requiredWhenEnabled(bool("IFOOD_ENABLED", false), "IFOOD_CLIENT_ID"),
  IFOOD_CLIENT_SECRET: requiredWhenEnabled(bool("IFOOD_ENABLED", false), "IFOOD_CLIENT_SECRET"),
  IFOOD_MERCHANT_ID: requiredWhenEnabled(bool("IFOOD_ENABLED", false), "IFOOD_MERCHANT_ID"),
  IFOOD_APP_NAME: process.env.IFOOD_APP_NAME ?? "",
  IFOOD_APP_SLUG: process.env.IFOOD_APP_SLUG ?? "",
  /** Optional URL to run official token validation script in test environments. */
  IFOOD_OAUTH_TOKEN_URL: process.env.IFOOD_OAUTH_TOKEN_URL ?? "",

  TWILIO_ENABLED: bool("TWILIO_ENABLED", false),
  TWILIO_ACCOUNT_SID: requiredWhenEnabled(bool("TWILIO_ENABLED", false), "TWILIO_ACCOUNT_SID"),
  TWILIO_AUTH_TOKEN: requiredWhenEnabled(bool("TWILIO_ENABLED", false), "TWILIO_AUTH_TOKEN"),
  TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886",
  TWILIO_WHATSAPP_TO: process.env.TWILIO_WHATSAPP_TO ?? "",
  TWILIO_SANDBOX_JOIN_CODE: process.env.TWILIO_SANDBOX_JOIN_CODE ?? "",
};
