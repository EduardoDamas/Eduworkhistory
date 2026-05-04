"use client";

import { useEffect, useState } from "react";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { EmptyState } from "../../../../components/ui/EmptyState";
import { Skeleton } from "../../../../components/ui/Skeleton";
import { getSession, getTenantUsers, type TenantUser, updateTenantUserRole } from "../../../../lib/api";
import { formatDate } from "../../../../lib/format";
import { useToast } from "../../../../lib/useToast";

const editableRoles: Array<"ADMIN" | "MODERATOR" | "USER"> = ["ADMIN", "MODERATOR", "USER"];

export default function UsersRolesPage() {
  const toast = useToast();
  const session = getSession();
  const tenantId = session?.tenantId ?? "";
  const role = session?.tenantRole ?? session?.userRole ?? "USER";
  const isOwner = role === "OWNER";

  const [users, setUsers] = useState<TenantUser[]>([]);
  const [draftRoles, setDraftRoles] = useState<Record<string, TenantUser["role"]>>({});
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadUsers() {
    if (!tenantId) return;
    setLoading(true);
    try {
      const rows = await getTenantUsers(tenantId);
      setUsers(rows);
      setDraftRoles(Object.fromEntries(rows.map((r) => [r.userId, r.role])));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, [tenantId]);

  async function saveRole(user: TenantUser) {
    const nextRole = draftRoles[user.userId];
    if (!nextRole || nextRole === user.role) return;
    if (!isOwner) return;
    if (user.userId === session?.userId && user.role === "OWNER") return;
    if (!editableRoles.includes(nextRole as "ADMIN" | "MODERATOR" | "USER")) return;

    setSavingUserId(user.userId);
    try {
      await updateTenantUserRole(tenantId, user.userId, nextRole as "ADMIN" | "MODERATOR" | "USER");
      toast.success(`Role updated for ${user.email}`);
      await loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update role";
      setError(message);
      toast.error(message);
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Users & Roles</h1>
      {!isOwner ? <p className="text-sm text-amber-700">Admin users can view roles, but only OWNER can edit roles.</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <Card title="Tenant members">
          <div className="space-y-3">
            <Skeleton className="h-8 w-11/12" />
            <Skeleton className="h-8 w-3/5" />
            <Skeleton className="h-8 w-4/5" />
          </div>
        </Card>
      ) : (
      <Card title="Tenant members">
        {!users.length ? (
          <EmptyState icon="👥" title="No users yet" description="Members will appear here as they join the tenant." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="table-head">
                  <th scope="col" className="pb-2">Email</th>
                  <th scope="col" className="pb-2">Role</th>
                  <th scope="col" className="pb-2">Joined</th>
                  <th scope="col" className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelfOwner = user.userId === session?.userId && user.role === "OWNER";
                  const disabled = !isOwner || user.role === "OWNER" || isSelfOwner;
                  const roleVariant =
                    user.role === "OWNER" ? "success" : user.role === "MODERATOR" ? "warning" : user.role === "USER" ? "neutral" : "neutral";

                  return (
                    <tr key={user.userId} className="transition-colors duration-150 hover:bg-gray-50">
                      <td className="table-cell">{user.email}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <Badge label={user.role} variant={roleVariant} />
                          <select
                            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs transition-colors duration-150 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            disabled={disabled}
                            value={draftRoles[user.userId] ?? user.role}
                            onChange={(e) => setDraftRoles((prev) => ({ ...prev, [user.userId]: e.target.value as TenantUser["role"] }))}
                          >
                            <option value="OWNER">OWNER</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="MODERATOR">MODERATOR</option>
                            <option value="USER">USER</option>
                          </select>
                        </div>
                      </td>
                      <td className="table-cell">{formatDate(user.createdAt)}</td>
                      <td className="table-cell">
                        <Button disabled={disabled} loading={savingUserId === user.userId} onClick={() => void saveRole(user)}>
                          Save
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      )}
    </div>
  );
}
