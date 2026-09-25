import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: "#0a0a0a", // Primary dark background
          900: "#121214", // Surface / Sidebar
          800: "#18181b", // Card background
          700: "#27272a", // Borders / Dividers
          600: "#3f3f46", // Low-contrast highlights
        },
        brand: {
          DEFAULT: "#3b82f6",
          hover: "#2563eb",
          muted: "rgba(59, 130, 246, 0.15)",
        },
        status: {
          success: "#22c55e",
          "success-bg": "rgba(34, 197, 94, 0.12)",
          warning: "#f59e0b",
          "warning-bg": "rgba(245, 158, 11, 0.12)",
          error: "#ef4444",
          "error-bg": "rgba(239, 68, 68, 0.12)",
          info: "#64748b",
          "info-bg": "rgba(100, 116, 139, 0.12)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
