"use client";

import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader } from "./Loader";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white shadow-sm motion-safe:hover:bg-brand-600 focus:ring-brand",
  secondary: "border border-slate-300 bg-white text-slate-800 motion-safe:hover:bg-slate-50 focus:ring-brand",
  danger: "bg-red-600 text-white motion-safe:hover:bg-red-700 focus:ring-red-500",
  ghost: "border border-slate-200 bg-white text-slate-700 motion-safe:hover:bg-slate-50 focus:ring-brand",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  children: ReactNode;
};

export function Button({ variant = "primary", loading = false, disabled, children, className, ...props }: Props) {
  const [showLoading, setShowLoading] = useState(loading);
  const loadingStartRef = useRef<number | null>(loading ? Date.now() : null);

  useEffect(() => {
    if (loading) {
      loadingStartRef.current = Date.now();
      setShowLoading(true);
      return;
    }

    if (!showLoading) return;
    const startedAt = loadingStartRef.current;
    const elapsed = startedAt ? Date.now() - startedAt : 300;
    const delay = Math.max(300 - elapsed, 0);
    const timeout = window.setTimeout(() => setShowLoading(false), delay);
    return () => window.clearTimeout(timeout);
  }, [loading, showLoading]);

  const isDisabled = disabled || showLoading;
  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 motion-safe:active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className ?? ""}`}
    >
      <span className={`transition-opacity duration-150 ${showLoading ? "opacity-100" : "opacity-0"}`}>
        <Loader size="sm" />
      </span>
      {children}
    </button>
  );
}
