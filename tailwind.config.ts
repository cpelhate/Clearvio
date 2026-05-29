import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-primary)"],
        mono: ["var(--font-mono)"],
      },
      colors: {
        bg: {
          primary:   "var(--color-bg-primary)",
          secondary: "var(--color-bg-secondary)",
          tertiary:  "var(--color-bg-tertiary)",
          elevated:  "var(--color-bg-elevated)",
        },
        border: {
          subtle:  "var(--color-border-subtle)",
          default: "var(--color-border-default)",
          strong:  "var(--color-border-strong)",
        },
        text: {
          primary:   "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          tertiary:  "var(--color-text-tertiary)",
          disabled:  "var(--color-text-disabled)",
        },
        accent: {
          bg:      "var(--color-accent-bg)",
          subtle:  "var(--color-accent-subtle)",
          DEFAULT: "var(--color-accent-default)",
          strong:  "var(--color-accent-strong)",
          text:    "var(--color-accent-text)",
        },
        success: {
          bg:      "var(--color-success-bg)",
          DEFAULT: "var(--color-success-default)",
          text:    "var(--color-success-text)",
        },
        warning: {
          bg:      "var(--color-warning-bg)",
          DEFAULT: "var(--color-warning-default)",
          text:    "var(--color-warning-text)",
        },
        danger: {
          bg:      "var(--color-danger-bg)",
          DEFAULT: "var(--color-danger-default)",
          text:    "var(--color-danger-text)",
        },
      },
      borderRadius: {
        sm:   "var(--radius-sm)",
        md:   "var(--radius-md)",
        lg:   "var(--radius-lg)",
        xl:   "var(--radius-xl)",
        full: "var(--radius-full)",
      },
      spacing: {
        "1":  "var(--space-1)",
        "2":  "var(--space-2)",
        "3":  "var(--space-3)",
        "4":  "var(--space-4)",
        "5":  "var(--space-5)",
        "6":  "var(--space-6)",
        "8":  "var(--space-8)",
        "10": "var(--space-10)",
        "12": "var(--space-12)",
        "16": "var(--space-16)",
      },
      transitionTimingFunction: {
        default: "var(--ease-default)",
        spring:  "var(--ease-spring)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
