"use client";

type BadgeVariant = "success" | "warning" | "error" | "neutral" | "info" | "owner";

const styles: Record<BadgeVariant, string> = {
  success: "border-emerald-200/80 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200/80 bg-amber-50 text-amber-800",
  error: "border-red-200/80 bg-red-50 text-red-800",
  neutral: "border-slate-200 bg-slate-100 text-slate-700",
  info: "border-sky-200/80 bg-sky-50 text-sky-800",
  owner: "border-teal-200/80 bg-teal-50 text-teal-900",
};

export function Badge({ label, variant = "neutral" }: { label: string; variant?: BadgeVariant }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide transition-all duration-150 motion-safe:hover:scale-105 ${styles[variant]}`}
    >
      {label}
    </span>
  );
}
