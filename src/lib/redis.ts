import Redis from "ioredis";
import { env } from "../config/env.js";

const globalForRedis = globalThis as unknown as { redis?: Redis };

export function getRedis(): Redis {
  if (!globalForRedis.redis) {
    globalForRedis.redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }
  return globalForRedis.redis;
}
