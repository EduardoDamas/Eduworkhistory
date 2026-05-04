"use client";

type BadgeVariant = "success" | "warning" | "error" | "neutral";

const styles: Record<BadgeVariant, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  error: "border-red-200 bg-red-50 text-red-700",
  neutral: "border-slate-200 bg-slate-100 text-slate-700",
};

export function Badge({ label, variant = "neutral" }: { label: string; variant?: BadgeVariant }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium transition-all duration-150 motion-safe:hover:scale-105 ${styles[variant]}`}>
      {label}
    </span>
  );
}
