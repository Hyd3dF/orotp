/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#6366F1',
        'primary-dark': '#4F46E5',
        'primary-light': '#818CF8',
        accent: '#10B981',
        'accent-dark': '#059669',
        surface: '#FFFFFF',
        background: '#F8FAFC',
        text: '#1E293B',
        'text-secondary': '#64748B',
        border: '#E2E8F0',
        danger: '#EF4444',
        warning: '#F59E0B',
      },
    },
  },
  plugins: [],
}
