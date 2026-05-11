/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        canvas: "#060B14",
        surface: "#0D1421",
        elevated: "#131D2E",
        border: {
          subtle: "#1A2435",
          DEFAULT: "#243044",
          strong: "#2E3D55",
        },
        ink: {
          primary: "#EDF2F8",
          secondary: "#8FA3BF",
          muted: "#4A5B73",
          disabled: "#2E3D55",
        },
        profit: {
          DEFAULT: "#10D98A",
          dim: "#0A7D50",
          bg: "#071F14",
        },
        loss: {
          DEFAULT: "#F04B50",
          dim: "#8B1A1D",
          bg: "#1F0708",
        },
        warn: {
          DEFAULT: "#F0A500",
          dim: "#8B6000",
          bg: "#1F1500",
        },
        info: {
          DEFAULT: "#4B8EFF",
          dim: "#1A3D8B",
          bg: "#070F1F",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.25s ease-out",
        "slide-up": "slideUp 0.25s ease-out",
        "slide-down": "slideDown 0.2s ease-out",
        "scale-in": "scaleIn 0.15s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
