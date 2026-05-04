import type { ReactNode } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { DashboardShell } from "../../components/DashboardShell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <DashboardShell>
        <div className="animate-fade-in">{children}</div>
      </DashboardShell>
    </AuthGuard>
  );
}
