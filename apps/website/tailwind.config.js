/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'media',
  content: ['./src/**/*.{njk,md}'],
  theme: {
    extend: {}
  },
  plugins: [require('@tailwindcss/typography')]
};
