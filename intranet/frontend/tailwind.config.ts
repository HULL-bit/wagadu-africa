import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        wagadu: {
          ivory: "#FBF6EC",
          sand: "#F0E4C8",
          gold: "#F6BB24",
          amber: "#FFA900",
          terracotta: "#D2812E",
          brown: "#6E3C13",
          bark: "#4A2A12",
          ebony: "#1E0F04",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-work-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: { xl: "1rem", "2xl": "1.5rem" },
    },
  },
  plugins: [],
};

export default config;
