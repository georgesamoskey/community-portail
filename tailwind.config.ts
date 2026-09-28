import type { Config } from "tailwindcss";

/**
 * Palette « Confiance & Assurance » — ISO Android (Color.kt)
 * Trust Blue #337AB7 · Navy · Trust Teal · Confidence Gold
 */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        ink: {
          DEFAULT: "#0D1F33",
          soft: "#2C4A6B",
          mute: "#546E8A",
          faint: "#7A9AB5",
        },
        brand: {
          50: "#D6EAF8",
          100: "#B8D9F0",
          200: "#8BC0E4",
          300: "#5B9FD4",
          400: "#458FC8",
          500: "#337AB7",
          600: "#1A5276",
          700: "#0D3B6B",
          800: "#0A1F3D",
          900: "#061428",
        },
        mint: {
          50: "#E6F7F8",
          100: "#C5EEF1",
          200: "#8ADDE4",
          300: "#3BBFCC",
          400: "#1AABBA",
          500: "#0E9AA7",
          600: "#0A7580",
          700: "#085A63",
          800: "#06464D",
          900: "#04353A",
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
        soft: "0 1px 2px rgba(10,31,61,0.04), 0 8px 24px rgba(10,31,61,0.06)",
        lift: "0 12px 40px rgba(51,122,183,0.18), 0 4px 12px rgba(10,31,61,0.06)",
        chat: "0 0 0 1px rgba(10,31,61,0.04), 0 20px 50px rgba(10,31,61,0.08)",
      },
      borderRadius: {
        "2.5xl": "1.25rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
