import Redis from "ioredis";
import { env } from "../../config/env.js";

/** BullMQ requires maxRetriesPerRequest: null on ioredis connections. */
export function createRedisConnection(): Redis {
  return new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
}
