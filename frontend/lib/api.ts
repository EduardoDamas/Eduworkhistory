"use client";

import { demoUsers, getDemoBilling, getDemoOrders, getDemoPushAttempts } from "./demoData";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const STORAGE_KEY = "comanda_saas_session";

export type UserRole = "OWNER" | "ADMIN" | "MODERATOR" | "USER";

export type AuthSession = {
  token: string;
  userId?: string;
  email: string;
  tenantId: string;
  tenantName: string;
  apiKey?: string;
  userRole?: UserRole;
  tenantRole?: UserRole;
};

export type TenantUser = {
  userId: string;
  email: string;
  role: UserRole;
  createdAt: string;
};

let mockUsers: TenantUser[] = [...demoUsers] as TenantUser[];

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export async function getTenantUsers(tenantId: string): Promise<TenantUser[]> {
  return apiRequest<TenantUser[]>(`/saas/tenants/${tenantId}/users`);
}

export async function updateTenantUserRole(
  tenantId: string,
  userId: string,
  role: "ADMIN" | "MODERATOR" | "USER",
): Promise<{ success: true; userId: string; tenantId: string; role: "ADMIN" | "MODERATOR" | "USER" }> {
  return apiRequest(`/saas/tenants/${tenantId}/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (DEMO_MODE) return mockApiRequest<T>(path, init);

  const session = getSession();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(session?.token ? { authorization: `Bearer ${session.token}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

async function mockApiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  await sleep(220);
  const method = (init?.method ?? "GET").toUpperCase();

  if (path === "/saas/me") {
    const session = getSession();
    return {
      user: { id: session?.userId ?? "demo_user", email: session?.email ?? "owner@demo-tenant.com", role: "OWNER" },
      tenants: [{ id: session?.tenantId ?? "demo_tenant", name: session?.tenantName ?? "Demo Tenant", apiKey: "demo_api_key", role: "OWNER" }],
    } as T;
  }

  if (path === "/comanda/orders/pending" && method === "GET") {
    const demoOrders = getDemoOrders();
    return { orders: demoOrders, meta: { count: demoOrders.length, polledAt: new Date().toISOString() } } as T;
  }
  if (path.startsWith("/comanda/orders/") && path.endsWith("/push") && method === "POST") {
    return { queued: true } as T;
  }
  if (path.startsWith("/comanda/push-attempts") && method === "GET") {
    const demoPushAttempts = getDemoPushAttempts();
    return demoPushAttempts as T;
  }
  if (path.startsWith("/comanda/push-attempts/") && path.endsWith("/retry") && method === "POST") {
    return { queued: true } as T;
  }
  if (path === "/saas/billing" && method === "GET") {
    const demoBilling = getDemoBilling();
    return demoBilling as T;
  }
  if (path === "/integrations/health" && method === "GET") {
    return {
      ifood: {
        enabled: true,
        clientIdConfigured: true,
        clientSecretConfigured: true,
        merchantIdConfigured: true,
      },
      twilio: {
        enabled: true,
        accountSidConfigured: true,
        authTokenConfigured: true,
        whatsappFromConfigured: true,
        whatsappToConfigured: true,
        sandboxJoinCodeConfigured: true,
        sandboxFrom: "whatsapp:+14155238886",
      },
      testMode: true,
    } as T;
  }
  if (path === "/comanda/settings/mapping" && method === "GET") {
    return {
      statusMapping: { PENDING_CONFIRMATION: 0, ORDER_ACCEPTED: 1 },
      orders: { table: "PEDIDOS" },
      items: { table: "PEDIDO_ITENS" },
    } as T;
  }
  if (path === "/comanda/settings/mapping" && method === "PUT") {
    return { saved: true } as T;
  }

  if (path.includes("/saas/tenants/") && path.endsWith("/users") && method === "GET") {
    return mockUsers as T;
  }
  if (path.includes("/users/") && path.endsWith("/role") && method === "PATCH") {
    const body = init?.body ? (JSON.parse(String(init.body)) as { role?: string }) : {};
    const role = body.role as "ADMIN" | "MODERATOR" | "USER" | undefined;
    const userId = path.split("/users/")[1]?.split("/role")[0];
    if (!role || !userId) throw new Error("Invalid role update");
    mockUsers = mockUsers.map((u) => (u.userId === userId ? { ...u, role } : u));
    return { success: true, userId, tenantId: getSession()?.tenantId ?? "demo_tenant", role } as T;
  }

  if (path === "/saas/tenants" && method === "POST") {
    return { tenant: { id: "demo_tenant", name: "Demo Tenant", apiKey: "demo_api_key", role: "OWNER" }, token: "demo_token" } as T;
  }
  if (path === "/saas/tenants/regenerate-api-key" && method === "POST") {
    return { apiKey: "demo_api_key_regenerated" } as T;
  }

  if (path === "/billing/create-checkout-session" && method === "POST") {
    return { url: "#" } as T;
  }

  throw new Error(`Demo route not mocked: ${method} ${path}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
