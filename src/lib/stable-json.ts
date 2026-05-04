import { createHash } from "node:crypto";

/** Recursively sort object keys for deterministic JSON serialization. */
export function sortKeysDeep(input: unknown): unknown {
  if (input === null || typeof input !== "object") return input;
  if (Array.isArray(input)) return input.map(sortKeysDeep);
  const obj = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    out[key] = sortKeysDeep(obj[key]);
  }
  return out;
}

export function stableJsonStringify(input: unknown): string {
  return JSON.stringify(sortKeysDeep(input));
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}
