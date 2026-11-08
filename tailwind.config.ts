import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        mist: '#eef2f5',
        ink: { DEFAULT: '#0e1b2c', soft: '#4a5a6e', faint: '#8493a6' },
        rule: '#d8e0e8',
        harbor: { DEFAULT: '#0b6e99', dark: '#085577', tint: '#e3f1f8' },
        sev: { critical: '#b42318', high: '#c2570c', medium: '#a16207', low: '#3b6a8a' },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
} satisfies Config;
