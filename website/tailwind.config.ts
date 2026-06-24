import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        midnight: "#07111F",
        indigo: {
          DEFAULT: "#283593",
          50: "#eef0fb",
          100: "#d6dbf4",
          600: "#283593",
          700: "#1f2974",
        },
        cyan: {
          DEFAULT: "#00D4FF",
          glow: "#33ddff",
          hover: "#4FC3F7",
        },
        success: "#22C55E",
        // Semantic tokens driven by CSS variables (see globals.css)
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        elevated: "rgb(var(--elevated) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-inter-tight)", "var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      maxWidth: {
        content: "1200px",
        prose: "68ch",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.12)",
        "card-hover":
          "0 1px 2px rgba(15,23,42,0.05), 0 24px 48px -16px rgba(15,23,42,0.20)",
        glow: "0 0 0 1px rgba(0,212,255,0.25), 0 12px 48px -8px rgba(0,212,255,0.35)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        "grid-flow": {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "40px 40px" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) both",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        "grid-flow": "grid-flow 8s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
