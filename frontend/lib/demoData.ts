export type DemoOrder = {
  id: string;
  status: "PENDING_CONFIRMATION" | "ORDER_ACCEPTED";
  statusCode: 0 | 1;
  total: number;
  createdAt: string;
};

export type DemoPushAttempt = {
  id: string;
  orderId: string;
  status: "SUCCESS" | "FAILED" | "RETRYING";
  attemptCount: number;
  lastError: string | null;
  updatedAt: string;
};

export type DemoUser = {
  userId: string;
  email: string;
  role: "OWNER" | "ADMIN" | "USER";
  createdAt: string;
};

function jitter(base: number, span: number): number {
  return base + Math.round(Math.random() * span);
}

export function getDemoOrders(): DemoOrder[] {
  const now = Date.now();
  return [
    {
      id: `ord_demo_${jitter(1001, 30)}_x7f92`,
      status: "PENDING_CONFIRMATION",
      statusCode: 0,
      total: Number((129 + Math.random() * 20).toFixed(2)),
      createdAt: new Date(now - 1000 * 60 * jitter(8, 7)).toISOString(),
    },
    {
      id: `ord_demo_${jitter(1101, 30)}_l2n49`,
      status: "ORDER_ACCEPTED",
      statusCode: 1,
      total: Number((69 + Math.random() * 18).toFixed(2)),
      createdAt: new Date(now - 1000 * 60 * jitter(20, 15)).toISOString(),
    },
  ];
}

export function getDemoPushAttempts(): DemoPushAttempt[] {
  const now = Date.now();
  return [
    {
      id: "attempt_demo_1",
      orderId: `ord_demo_${jitter(1001, 20)}_x7f92`,
      status: "SUCCESS",
      attemptCount: 1,
      lastError: null,
      updatedAt: new Date(now - 1000 * 60 * jitter(2, 5)).toISOString(),
    },
    {
      id: "attempt_demo_2",
      orderId: `ord_demo_${jitter(1200, 30)}_a8m31`,
      status: "FAILED",
      attemptCount: jitter(2, 2),
      lastError: "Socket timeout while opening MSSQL transaction for tenant demo_store",
      updatedAt: new Date(now - 1000 * 60 * jitter(12, 18)).toISOString(),
    },
    {
      id: "attempt_demo_3",
      orderId: `ord_demo_${jitter(1300, 30)}_q0w88`,
      status: "RETRYING",
      attemptCount: jitter(2, 1),
      lastError: "Deadlock victim; retry scheduled in 8 seconds",
      updatedAt: new Date(now - 1000 * 60 * jitter(20, 22)).toISOString(),
    },
  ];
}

export const demoUsers: DemoUser[] = [
  {
    userId: "user_owner_demo",
    email: "owner@demo-tenant.com",
    role: "OWNER",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
  },
  {
    userId: "user_admin_demo",
    email: "admin@demo-tenant.com",
    role: "ADMIN",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
  {
    userId: "user_member_demo",
    email: "member@demo-tenant.com",
    role: "USER",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
  },
];

export function getDemoBilling() {
  const now = Date.now();
  return {
    plan: "PRO",
    status: "ACTIVE",
    usageCount: jitter(42, 18),
    currentPeriodStart: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString(),
    currentPeriodEnd: new Date(now + 1000 * 60 * 60 * 24 * 28).toISOString(),
  };
}
