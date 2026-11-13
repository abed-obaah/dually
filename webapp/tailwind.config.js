/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0384B3',
        secondary: '#07A5DE',
        navpill: '#04729B',
        ink: '#0F1A22',
        label: '#1A2730',
        caption: '#8A97A0',
        muted: '#5B6770',
        page: '#F4F6F8',
        hairline: '#EFF2F4',
        cardstroke: '#EEF1F3',
        chip: '#EAF4FA',
        hint: '#8FA0AB',
        mutedtext: '#AFC0CB',
        like: '#FF2D55',
        danger: '#E53935',
      },
      fontFamily: { poppins: ['Poppins', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
