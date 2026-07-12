import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-context";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Rataria — Detecção de Surebets",
  description:
    "Agregação de odds multi-provedor e detecção de oportunidades matemáticas de arbitragem esportiva, com matching explicável e revalidação em tempo real.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="font-sans">
      <body className="min-h-screen">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
