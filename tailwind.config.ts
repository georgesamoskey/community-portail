import type { Config } from "tailwindcss";

/**
 * Palette « Confiance & Assurance » — ISO Android (Color.kt)
 * Trust Blue · Navy · Trust Teal — tokens CSS (:root / html.dark)
 */
export default {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        ink: {
          DEFAULT: "var(--ink)",
          soft: "var(--ink-soft)",
          mute: "var(--ink-mute)",
          faint: "var(--ink-faint)",
        },
        brand: {
          50: "var(--brand-50)",
          100: "var(--brand-100)",
          200: "var(--brand-200)",
          300: "var(--brand-300)",
          400: "var(--brand-400)",
          500: "var(--brand-500)",
          600: "var(--brand-600)",
          700: "var(--brand-700)",
          800: "var(--brand-800)",
          900: "var(--brand-900)",
        },
        mint: {
          50: "var(--mint-50)",
          100: "var(--mint-100)",
          200: "var(--mint-200)",
          300: "var(--mint-300)",
          400: "var(--mint-400)",
          500: "var(--mint-500)",
          600: "var(--mint-600)",
          700: "var(--mint-700)",
          800: "var(--mint-800)",
          900: "var(--mint-900)",
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
        soft: "var(--shadow-soft)",
        lift: "var(--shadow-lift)",
        chat: "var(--shadow-chat)",
      },
      borderRadius: {
        "2.5xl": "1.25rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
