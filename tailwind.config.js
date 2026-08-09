/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        encre: '#12141c',      // fond principal, bleu-noir profond
        papier: '#f6f1e6',     // texte clair, ton papier
        braise: '#c76b3f',     // accent chaleureux (couverture de livre)
        sauge: '#7a8b6f',      // accent secondaire, discret
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Source Serif 4"', 'serif'],
      },
    },
  },
  plugins: [],
}
