import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,html}", "./public/**/*.html"],
  theme: {
    extend: {
      colors: {
        "brand-1": "#5433FF",
        "brand-2": "#4379FF",
        "brand-3": "#1CC6FF",
        "brand-4": "#97FBD1",
        "brand-5": "#F6A4EC",
      },
    },
  },
  plugins: [],
} satisfies Config;
