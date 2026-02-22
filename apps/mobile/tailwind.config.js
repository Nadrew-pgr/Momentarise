/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        foreground: "#0a0a0a",
        card: "#ffffff",
        "card-foreground": "#0a0a0a",
        primary: "#171717",
        "primary-foreground": "#fafafa",
        secondary: "#f5f5f5",
        "secondary-foreground": "#171717",
        muted: "#f5f5f5",
        "muted-foreground": "#737373",
        accent: "#f5f5f5",
        "accent-foreground": "#171717",
        destructive: "#ef4444",
        border: "#e5e5e5",
        input: "#e5e5e5",
        ring: "#a3a3a3",
      },
    },
  },
  plugins: [],
};
