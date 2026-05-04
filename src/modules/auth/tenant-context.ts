import { AsyncLocalStorage } from "node:async_hooks";
import type { TenantContextResolved } from "./types.js";

const als = new AsyncLocalStorage<TenantContextResolved>();

export function runWithTenant<T>(tenant: TenantContextResolved, fn: () => T): T {
  return als.run(tenant, fn);
}

export function getTenant(): TenantContextResolved {
  const t = als.getStore();
  if (!t) throw new Error("Tenant context not initialized");
  return t;
}

export function getTenantOptional(): TenantContextResolved | undefined {
  return als.getStore();
}
