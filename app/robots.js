export default function robots() {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/messages', '/profil/modifier'] },
    ],
    sitemap: 'https://app.encres.vercel.app/sitemap.xml',
  }
}
