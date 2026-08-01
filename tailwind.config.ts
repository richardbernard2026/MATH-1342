import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0d12",
        panel: "#141821",
        panel2: "#1b202b",
        border: "#2a3040",
        // one accent colour per chapter
        ch1: "#22d3ee",
        ch2: "#f472b6",
        ch3: "#a3e635",
        ch4: "#4f8fff",
        ch5: "#b46fef",
        ch6: "#ff9f43",
        good: "#35c98f",
        bad: "#ff5d5d",
        warn: "#ffd166",
      },
    },
  },
  plugins: [],
};

export default config;
