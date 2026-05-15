/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // --- Brand ---
        brand: {
          50: '#EEF4FB',
          100: '#D5E2F1',
          200: '#A6BFDF',
          300: '#6E94C5',
          400: '#3D6AA5',
          500: '#1E3A5F',
          600: '#1A3354',
          700: '#152A45',
          800: '#102036',
          900: '#0B1726',
        },

        // --- Money semantics ---
        income: {
          DEFAULT: '#10B981',
          50: '#ECFDF5',
          100: '#D1FAE5',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        expense: {
          DEFAULT: '#EF4444',
          50: '#FEF2F2',
          100: '#FEE2E2',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },
        receivable: {
          DEFAULT: '#10B981',
          500: '#10B981',
          600: '#059669',
        },
        payable: {
          DEFAULT: '#F59E0B',
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        warning: {
          DEFAULT: '#F59E0B',
          50: '#FFFBEB',
          500: '#F59E0B',
          600: '#D97706',
        },

        // --- Neutrals (Slate scale — slightly cooler than RN defaults) ---
        ink: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },
      },
      fontFamily: {
        // The platform-native fonts render best; RN picks the right one per OS.
        sans: ['System', 'ui-sans-serif', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.625rem',
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.625rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.06)',
        elevated:
          '0 4px 6px rgba(15, 23, 42, 0.07), 0 10px 15px rgba(15, 23, 42, 0.05)',
        fab: '0 10px 25px rgba(16, 185, 129, 0.35)',
      },
      letterSpacing: {
        widest: '0.12em',
      },
    },
  },
  plugins: [],
};
