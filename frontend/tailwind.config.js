import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/components/ui/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // === MÀU CŨ CỦA BẠN (GIỮ NGUYÊN ĐỂ KHÔNG HỎNG ADMIN/LOGIN) ===
        "outline": "#8d90a2",
        "on-primary": "#002682",
        "surface-container-lowest": "#060e20",
        "error": "#ffb4ab",
        "secondary-fixed-dim": "#bec6e0",
        "on-error-container": "#ffdad6",
        "surface-variant": "#2d3449",
        "surface-container-highest": "#2d3449",
        "on-surface": "#dae2fd",
        "on-secondary-fixed": "#131b2e",
        "primary-fixed": "#dde1ff",
        "primary-container": "#0052ff",
        "inverse-surface": "#dae2fd",
        "inverse-primary": "#004ced",
        "error-container": "#93000a",
        "on-primary-fixed-variant": "#0038b6",
        "tertiary-fixed": "#c4e7ff",
        "on-secondary": "#283044",
        "on-primary-container": "#dfe3ff",
        "surface-container": "#171f33",
        "surface-bright": "#31394d",
        "on-tertiary-container": "#caeaff",
        "surface-dim": "#0b1326",
        "on-secondary-fixed-variant": "#3f465c",
        "surface-tint": "#b7c4ff",
        "secondary-container": "#3f465c",
        "tertiary-fixed-dim": "#7bd0ff",
        "on-primary-fixed": "#001452",
        "on-tertiary-fixed-variant": "#004c69",
        "on-error": "#690005",
        "on-tertiary-fixed": "#001e2c",
        "tertiary-container": "#006e95",
        "outline-variant": "#434656",
        "inverse-on-surface": "#283044",
        "secondary-fixed": "#dae2fd",
        "on-surface-variant": "#c3c5d9",
        "surface-container-high": "#222a3d",
        "tertiary": "#7bd0ff",
        "surface": "#0b1326",
        "on-tertiary": "#00354a",
        "on-background": "#dae2fd",
        "surface-container-low": "#131b2e",
        "primary-fixed-dim": "#b7c4ff",
        "on-secondary-container": "#adb4ce",

        // === MÀU MỚI CỦA SHADCN/FIGMA (DÙNG CHO ROSTER, TACTICS) ===
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      fontFamily: {
        "headline": ["Inter", "sans-serif"],
        "body": ["Inter", "sans-serif"],
        "label": ["Inter", "sans-serif"]
      },
      borderRadius: {
        // Hợp nhất bo góc của cả 2 hệ thống
        "DEFAULT": "0.25rem",
        sm: "calc(var(--radius) - 4px)",
        md: "calc(var(--radius) - 2px)",
        lg: "var(--radius)",
        xl: "0.75rem",
        "full": "9999px"
      },
    },
  },
  plugins: [animate],
}