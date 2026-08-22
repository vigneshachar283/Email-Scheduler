/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          500: "#4f6df5",
          600: "#3d55d6",
          700: "#3143ab",
        },
      },
    },
  },
  plugins: [],
};
