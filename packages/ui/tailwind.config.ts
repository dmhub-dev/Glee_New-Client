import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/**/*.{ts,tsx}',
    '../../apps/web/src/**/*.{ts,tsx}',
    '../../apps/vendor/src/**/*.{ts,tsx}',
    '../../apps/admin/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // ── Fonts ──────────────────────────────────────────────
      fontFamily: {
        sans:    ['Inter', 'sans-serif'],
        heading: ['Montserrat', 'sans-serif'],
        mono:    ['IBM Plex Mono', 'monospace'],
      },

      // ── Colours ────────────────────────────────────────────
      colors: {
        // shadcn CSS-var tokens
        border:     'hsl(var(--border))',
        input:      'hsl(var(--input))',
        ring:       'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',

        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        // Glee brand tokens
        neon: {
          pink:  '#FF2D8F',
          hover: '#FF4A9F',
        },
        glee: {
          bg:          '#0B0B10',
          'bg-secondary': '#141419',
          text:        '#F6F6F8',
          'text-muted': '#A7A7B2',
        },
      },

      // ── Border radius ──────────────────────────────────────
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      // ── Box shadows / neon glows ───────────────────────────
      boxShadow: {
        neon:        '0 0 18px rgba(255, 45, 143, 0.35)',
        'neon-strong': '0 0 28px rgba(255, 45, 143, 0.5)',
      },

      // ── Animations ─────────────────────────────────────────
      keyframes: {
        'pulse-neon': {
          '0%, 100%': { boxShadow: '0 0 18px rgba(255, 45, 143, 0.35)' },
          '50%':      { boxShadow: '0 0 28px rgba(255, 45, 143, 0.5)' },
        },
      },
      animation: {
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
