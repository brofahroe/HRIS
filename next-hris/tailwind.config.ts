import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)"],
        serif: ["var(--font-playfair)", "serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        batik: {
          bg: '#faf8f5', // Cream/off-white background
          red: '#c04838', // Terracotta/primary red
          dark: '#3e2723', // Dark text
        },
        primary: {
          50: '#fdf6f5',
          100: '#fbeceb',
          200: '#f5d6d3',
          300: '#ecb4ae',
          400: '#df877d',
          500: '#cd6053',
          600: '#c04838', // The terracotta
          700: '#98382d',
          800: '#7f3229',
          900: '#692e26',
        }
      },
    },
  },
  plugins: [],
};
export default config;
