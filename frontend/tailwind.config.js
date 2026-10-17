/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFCF9',
          100: '#FAF7F2',
          200: '#F4EFE6',
          300: '#EAE2D3',
          400: '#E0D4C0',
          500: '#C7B69C',
          pill: '#EADEC9',
          border: '#E8E2D6',
        },
        charcoal: {
          900: '#191816',
          800: '#2A2724',
          700: '#423E3A',
          600: '#5C5751',
          500: '#756F68',
        },
        risk: {
          low: '#16A34A',
          'low-bg': '#DCFCE7',
          'low-text': '#14532D',
          medium: '#D97706',
          'medium-bg': '#FEF3C7',
          'medium-text': '#78350F',
          high: '#DC2626',
          'high-bg': '#FEE2E2',
          'high-text': '#7F1D1D',
          disruption: '#B91C1C',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        soft: '0 2px 10px -2px rgba(42, 39, 36, 0.05), 0 1px 3px -1px rgba(42, 39, 36, 0.03)',
        card: '0 4px 20px -4px rgba(42, 39, 36, 0.06)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
