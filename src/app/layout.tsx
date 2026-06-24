import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pront. — Sua Saúde Digital Completa",
  description:
    "Plataforma de saúde digital: telemedicina, teleodontologia, prontuário eletrônico e gestão completa de clínicas. Consulte médicos e dentistas online, com IA 24h e receitas digitais válidas em todo Brasil.",
  keywords: [
    "telemedicina",
    "teleodontologia",
    "prontuário eletrônico",
    "gestão de clínicas",
    "saúde digital",
    "receita digital",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${sans.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
