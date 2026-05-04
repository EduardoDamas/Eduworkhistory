"use client";

import { useEffect, useState } from "react";
import { TOAST_EVENT, type ToastPayload } from "../../lib/useToast";

type AnimatedToast = ToastPayload & {
  visible: boolean;
};

export function Toast() {
  const [toasts, setToasts] = useState<AnimatedToast[]>([]);

  useEffect(() => {
    function onToast(event: Event) {
      const payload = (event as CustomEvent<ToastPayload>).detail;
      setToasts((prev) => [...prev, { ...payload, visible: false }]);
      window.requestAnimationFrame(() => {
        setToasts((prev) => prev.map((toast) => (toast.id === payload.id ? { ...toast, visible: true } : toast)));
      });
      window.setTimeout(() => {
        setToasts((prev) => prev.map((toast) => (toast.id === payload.id ? { ...toast, visible: false } : toast)));
        window.setTimeout(() => {
          setToasts((prev) => prev.filter((toast) => toast.id !== payload.id));
        }, 300);
      }, payload.duration ?? 2600);
    }

    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 space-y-2" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-md ${
            toast.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          } transition-all duration-300 ease-out ${toast.visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
