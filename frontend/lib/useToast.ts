"use client";

import { useCallback } from "react";

export type ToastKind = "success" | "error";
export const TOAST_EVENT = "app:toast";

export type ToastPayload = {
  id: string;
  kind: ToastKind;
  message: string;
  duration?: number;
};

export function useToast() {
  const emit = useCallback((kind: ToastKind, message: string, duration = 2600) => {
    if (typeof window === "undefined") return;
    const payload: ToastPayload = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      kind,
      message,
      duration,
    };
    window.dispatchEvent(new CustomEvent<ToastPayload>(TOAST_EVENT, { detail: payload }));
  }, []);

  return {
    success: (message: string) => emit("success", message),
    error: (message: string) => emit("error", message),
  };
}
