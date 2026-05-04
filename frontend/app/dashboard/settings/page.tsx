"use client";

import Link from "next/link";
import { Card } from "../../../components/ui/Card";
import { getSession } from "../../../lib/api";

export default function SettingsPage() {
  const role = getSession()?.tenantRole ?? getSession()?.userRole ?? "USER";
  const canManage = role === "OWNER" || role === "ADMIN";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card title="Tenant settings" subtitle="Manage mapping, roles, and integration controls">
        {!canManage ? (
          <p className="text-sm text-amber-700">Your role does not have permission to change tenant settings.</p>
        ) : (
          <div className="flex gap-2">
            <Link
              href="/dashboard/settings/mapping"
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Mapping config
            </Link>
            <Link
              href="/dashboard/settings/users"
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Users & Roles
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
