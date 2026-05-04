"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { EmptyState } from "../../../../components/ui/EmptyState";
import { Skeleton } from "../../../../components/ui/Skeleton";
import { getSession, getTenantUsers, type TenantUser, updateTenantUserRole } from "../../../../lib/api";
import { useToast } from "../../../../lib/useToast";

const editableRoles: Array<"ADMIN" | "MODERATOR" | "USER"> = ["ADMIN", "MODERATOR", "USER"];

function roleBadgeVariant(r: TenantUser["role"]): "owner" | "info" | "warning" | "neutral" {
  if (r === "OWNER") return "owner";
  if (r === "ADMIN") return "info";
  if (r === "MODERATOR") return "warning";
  return "neutral";
}

export default function UsersRolesPage() {
  const toast = useToast();
  const session = getSession();
  const tenantId = session?.tenantId ?? "";
  const role = session?.tenantRole ?? session?.userRole ?? "USER";
  const isOwner = role === "OWNER";

  const [users, setUsers] = useState<TenantUser[]>([]);
  const [draftRoles, setDraftRoles] = useState<Record<string, TenantUser["role"]>>({});
  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
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

  const hasPendingChanges = useMemo(
    () => users.some((u) => (draftRoles[u.userId] ?? u.role) !== u.role),
    [users, draftRoles],
  );

  async function saveAll() {
    if (!isOwner || !tenantId) return;
    setSavingAll(true);
    setError(null);
    try {
      for (const user of users) {
        const next = draftRoles[user.userId] ?? user.role;
        if (next === user.role) continue;
        if (user.role === "OWNER") continue;
        if (next === "OWNER") continue;
        if (!editableRoles.includes(next as "ADMIN" | "MODERATOR" | "USER")) continue;
        await updateTenantUserRole(tenantId, user.userId, next);
      }
      toast.success("Alterações salvas");
      await loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao salvar";
      setError(message);
      toast.error(message);
    } finally {
      setSavingAll(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Users & Roles</h1>
        <p className="mt-1 text-sm text-slate-600">Gerencie membros da equipe e suas permissões (RBAC)</p>
      </div>
      {!isOwner ? <p className="text-sm text-amber-800">Apenas OWNER pode alterar funções. Admins podem visualizar.</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <Card>
          <div className="space-y-3">
            <Skeleton className="h-8 w-11/12" />
            <Skeleton className="h-8 w-3/5" />
            <Skeleton className="h-8 w-4/5" />
          </div>
        </Card>
      ) : (
        <Card>
          {!users.length ? (
            <EmptyState icon="👥" title="Nenhum usuário" description="Membros aparecerão aqui quando forem adicionados ao tenant." />
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="min-w-full">
                  <thead>
                    <tr className="table-head">
                      <th scope="col" className="px-4 pb-3">
                        Email
                      </th>
                      <th scope="col" className="px-4 pb-3">
                        Função atual
                      </th>
                      <th scope="col" className="px-4 pb-3">
                        Alterar função
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const isSelfOwner = user.userId === session?.userId && user.role === "OWNER";
                      const selectDisabled = !isOwner || user.role === "OWNER" || isSelfOwner;
                      return (
                        <tr key={user.userId} className="hover:bg-slate-50/80">
                          <td className="table-cell px-4 font-medium text-slate-800">{user.email}</td>
                          <td className="table-cell px-4">
                            <Badge label={user.role} variant={roleBadgeVariant(user.role)} />
                          </td>
                          <td className="table-cell px-4">
                            <div className="flex items-center gap-2">
                              <select
                                className="min-w-[140px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                                disabled={selectDisabled}
                                value={draftRoles[user.userId] ?? user.role}
                                onChange={(e) => setDraftRoles((prev) => ({ ...prev, [user.userId]: e.target.value as TenantUser["role"] }))}
                              >
                                <option value="OWNER">OWNER</option>
                                <option value="ADMIN">ADMIN</option>
                                <option value="MODERATOR">MODERATOR</option>
                                <option value="USER">USER</option>
                              </select>
                              {selectDisabled && user.role === "OWNER" ? (
                                <span className="text-slate-400" title="OWNER não pode ser alterado aqui">
                                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                                  </svg>
                                </span>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-sm text-slate-600">
                  <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  Alterações pendentes serão aplicadas ao salvar
                </p>
                <Button type="button" loading={savingAll} disabled={!isOwner || !hasPendingChanges} onClick={() => void saveAll()} className="gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25l-6.5 3.75V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                  </svg>
                  Salvar alterações
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      <div>
        <h2 className="text-lg font-bold text-slate-900">Hierarquia de permissões</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { r: "OWNER" as const, t: "Acesso completo. Pode gerenciar billing e membros críticos.", v: "owner" as const },
            { r: "ADMIN" as const, t: "Pode gerenciar usuários, configurações e acessar recursos operacionais.", v: "info" as const },
            { r: "MODERATOR" as const, t: "Ações limitadas conforme políticas do tenant.", v: "warning" as const },
            { r: "USER" as const, t: "Acesso de leitura e operações básicas.", v: "neutral" as const },
          ].map((item) => (
            <div key={item.r} className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-card">
              <Badge label={item.r} variant={item.v} />
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.t}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
