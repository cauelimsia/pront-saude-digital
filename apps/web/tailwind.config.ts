import type { Config } from "tailwindcss";

/**
 * Tokens de design derivados da paleta validada (dataviz skill):
 * superfícies/ink dark, cores de status fixas (never themed) e slots
 * categóricos (blue/aqua) para provedores. Validado com o script de CVD.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Planos e superfícies (dark SaaS)
        plane: "#0a0d13",
        surface: {
          DEFAULT: "#12161f",
          raised: "#161c28",
          overlay: "#1c2432",
          border: "#242c3a",
          hover: "#1a2130",
        },
        ink: {
          primary: "#f4f6fb",
          secondary: "#aab3c5",
          muted: "#6b7488",
        },
        // Status fixo (bandas de confiança / viabilidade)
        status: {
          good: "#0ca30c",
          warning: "#fab219",
          serious: "#ec835a",
          critical: "#d03b3b",
        },
        // Categórico (provedores)
        cat: {
          blue: "#3987e5",
          aqua: "#199e70",
          amber: "#c98500",
          violet: "#9085e9",
        },
        brand: {
          DEFAULT: "#3987e5",
          soft: "#1c5cab",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.4), 0 8px 24px -12px rgba(0,0,0,0.5)",
        glow: "0 0 0 1px rgba(57,135,229,0.25), 0 8px 32px -8px rgba(57,135,229,0.25)",
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(57,135,229,0.12), transparent)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
