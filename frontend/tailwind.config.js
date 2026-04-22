/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: "#FAF8F3",
          dark: "#F0EAE0",
          border: "#E2D9CC",
        },
        navy: {
          DEFAULT: "#1B2A4A",
          light: "#2D4070",
          muted: "#4A5568",
          subtle: "#6B7A99",
        },
        rust: {
          DEFAULT: "#8B3A3A",
          light: "#A85252",
          dark: "#6B2A2A",
          bg: "#FAF0F0",
        },
        editorial: {
          text: "#2C2C2C",
          muted: "#6B6560",
          border: "#DDD5C8",
          highlight: "#FFF3CC",
        },
      },
      fontFamily: {
        serif: ["Playfair Display", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.65rem", { lineHeight: "1rem" }],
      },
    },
  },
  plugins: [],
};
