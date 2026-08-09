/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        encre: '#0c0d13',       // fond principal, noir-encre profond
        encreClair: '#15161f',  // surfaces légèrement surélevées (cartes)
        papier: '#efe8d8',      // texte clair, ton parchemin
        or: '#c9962b',          // accent primaire — dorure, discret
        grenat: '#7d2e3a',      // accent secondaire — reliure de cuir
        ligne: 'rgba(239,232,216,0.09)', // séparateurs
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
