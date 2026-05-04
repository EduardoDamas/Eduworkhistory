import type { ReactNode } from "react";
import "./globals.css";
import { Toast } from "../components/ui/Toast";

export const metadata = {
  title: "Comanda SaaS Dashboard",
  description: "Modern multi-tenant integration dashboard",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Toast />
        {children}
      </body>
    </html>
  );
}
