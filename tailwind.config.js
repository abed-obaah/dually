/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm cream page background (matches reference)
        paper: '#FBF7EC',
        // Dark sections + cards
        night: '#0C0B0A',
        card: '#161311',
        // Orange accent — swap these to re-theme the whole site.
        // 500 / DEFAULT matches the reference brand orange (#FB6202).
        orange: {
          300: '#FDBA74',
          400: '#FB923C',
          500: '#FB6202',
          600: '#EA580C',
          700: '#C2410C',
          DEFAULT: '#FB6202',
        },
        // Soft peach used for FAQ cards / tints on cream
        peach: {
          DEFAULT: '#FBEEE1',
          deep: '#F7E3D0',
        },
        ink: {
          DEFAULT: '#18181B',
          muted: '#45556C',
        },
      },
      fontFamily: {
        sans: [
          'Plus Jakarta Sans',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem',
      },
      boxShadow: {
        soft: '0 8px 30px -12px rgba(23, 20, 14, 0.15)',
        card: '0 24px 60px -24px rgba(23, 20, 14, 0.20)',
        btn: '0 10px 24px -10px rgba(12, 11, 10, 0.55)',
        glow: '0 0 90px -20px rgba(242, 102, 28, 0.55)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-16px)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        marquee: 'marquee 30s linear infinite',
      },
    },
  },
  plugins: [],
}
