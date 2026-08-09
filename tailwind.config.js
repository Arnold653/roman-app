/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        encre: '#0d0f12',       // fond principal, noir-charbon profond
        encreClair: '#171a1e',  // surfaces légèrement surélevées (cartes)
        papier: '#e9eaea',      // texte clair, gris clair
        or: '#0079db',          // accent primaire — bleu
        grenat: '#414544',      // accent secondaire — gris charbon
        ligne: 'rgba(233,234,234,0.09)', // séparateurs
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Spectral"', 'serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      backgroundImage: {
        grain: "radial-gradient(circle at 1px 1px, rgba(239,232,216,0.035) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
}
