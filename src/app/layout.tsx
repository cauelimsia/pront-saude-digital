import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const sans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
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
