import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#171717",
        paper: "#f8f7f3",
        mint: "#6ee7b7",
        coral: "#f9735b",
        cobalt: "#2563eb"
      },
      boxShadow: {
        panel: "0 16px 40px rgba(23, 23, 23, 0.08)"
      }
    }
  },
  plugins: []
} satisfies Config;
