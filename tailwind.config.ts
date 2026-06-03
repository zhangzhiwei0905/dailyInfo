import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        briefBg: "#f6f4ef",
        briefFg: "#111111",
        briefMuted: "#77746b",
      },
    },
  },
};

export default config;
