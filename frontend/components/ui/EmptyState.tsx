"use client";

import type { ReactNode } from "react";

export function EmptyState({
  icon = "📭",
  title,
  description,
  hint,
  action,
}: {
  icon?: string;
  title: string;
  description: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
      <div className="text-2xl">{icon}</div>
      <h3 className="mt-3 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
