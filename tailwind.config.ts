import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta "Pront." — saúde digital, confiança e cuidado
        brand: {
          50: "#ecfdf7",
          100: "#d1faec",
          200: "#a7f3d9",
          300: "#6ee7bf",
          400: "#34d3a2",
          500: "#10b886", // primária
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
        ink: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d5dae3",
          300: "#b0bac9",
          400: "#8595aa",
          500: "#647590",
          600: "#4f5d77",
          700: "#414c61",
          800: "#384152",
          900: "#0f1729", // navy escuro p/ textos e footer
        },
        accent: {
          500: "#2563eb", // azul confiança
          600: "#1d4ed8",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 4px 24px -8px rgba(15, 23, 41, 0.12)",
        card: "0 1px 3px rgba(15,23,41,0.06), 0 8px 32px -12px rgba(15,23,41,0.12)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
