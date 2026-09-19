/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./index.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        obsidian: {
          bg: "#0f1015",
          card: "#15161b",
          surface: "#18191e",
          elevated: "#1e2027",
          border: "#252730",
          borderMuted: "#1c1e24",
          text: "#f1f3f5",
          muted: "#9ca3af",
          subtle: "#6b7280"
        },
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8"
        }
      }
    },
  },
  plugins: [],
};
