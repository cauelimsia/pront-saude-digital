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
        // Paleta literal do pront.app
        // primária = azul hsl(212 100% 40%) #005FCC
        brand: {
          50: "#eef5ff",
          100: "#d9e8ff",
          200: "#b6d2ff",
          300: "#84b5ff",
          400: "#4a90ff",
          500: "#1a6fff",
          600: "#005fcc", // --primary / --pront-navy
          700: "#004ea8",
          800: "#003f8a",
          900: "#00316b", // --pront-navy-dark
        },
        // acento = verde-menta hsl(166 100% 42%) #00D6A4
        accent: {
          50: "#e6fff8",
          100: "#ccfff1", // --pront-mint-light
          200: "#99ffe4",
          300: "#4dffd0",
          400: "#0eecb4",
          500: "#00d6a4", // --pront-mint / --accent / --success
          600: "#00b88c",
          700: "#009673",
        },
        // navy/cinza de texto (--foreground 215 25% 20%, etc.)
        ink: {
          50: "#f8fafc",
          100: "#e6ebf0", // --border 216 24% 92%
          200: "#d5dbe3",
          300: "#b0bac9",
          400: "#8595aa",
          500: "#6c7c93", // --muted-foreground 215 15% 50%
          600: "#52617a",
          700: "#414c61",
          800: "#333d4d",
          900: "#26303d", // --foreground 215 25% 20%
        },
        warning: "#f59e0b", // --pront-warning 38 92% 50%
        whatsapp: "#25d366",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // sombras literais do site (rgba(0,0,0,.08) / .15)
        soft: "0 4px 24px -6px rgba(0, 0, 0, 0.12)",
        card: "0 1px 3px rgba(0,0,0,0.08), 0 8px 28px -12px rgba(0,0,0,0.15)",
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
