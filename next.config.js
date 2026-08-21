/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // pdfjs-dist (legacy build, utilisé côté client pour extraire le texte des PDF envoyés par
    // l'admin) référence 'canvas' comme dépendance optionnelle pour un rendu côté serveur qu'on
    // n'utilise pas ici. Sans cet alias, le build échoue en cherchant à la résoudre.
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    }
    return config
  },
}

module.exports = nextConfig
