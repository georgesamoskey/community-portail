import type { Config } from "tailwindcss";

/**
 * Palette « Pulse » — social / communauté
 * Coral énergie + ink profond + mint confiance (épargne)
 */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        ink: {
          DEFAULT: "#12151c",
          soft: "#3d4454",
          mute: "#6b7385",
          faint: "#9aa3b5",
        },
        brand: {
          50: "#fff5f1",
          100: "#ffe8e0",
          200: "#ffcbb8",
          300: "#ffa488",
          400: "#ff7a52",
          500: "#ff5c35",
          600: "#ef3d18",
          700: "#c72d10",
          800: "#a32814",
          900: "#862616",
        },
        mint: {
          50: "#f0faf8",
          100: "#d5f3ee",
          200: "#aae6db",
          300: "#6fd1c0",
          400: "#3bb5a2",
          500: "#1f9786",
          600: "#167a6d",
          700: "#156257",
          800: "#154f47",
          900: "#14423c",
        },
        surface: {
          DEFAULT: "var(--surface)",
          raised: "var(--surface-raised)",
          sunken: "var(--surface-sunken)",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-portal-sans)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        display: [
          "var(--font-portal-display)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(18,21,28,0.04), 0 8px 24px rgba(18,21,28,0.06)",
        lift: "0 12px 40px rgba(239,61,24,0.12), 0 4px 12px rgba(18,21,28,0.06)",
        chat: "0 0 0 1px rgba(18,21,28,0.04), 0 20px 50px rgba(18,21,28,0.08)",
      },
      borderRadius: {
        "2.5xl": "1.25rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
