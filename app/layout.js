import './globals.css'

export const metadata = {
  title: 'Récits — lire, discuter, partager',
  description: 'Une nouvelle histoire chaque semaine, à lire et à discuter en communauté.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="font-body min-h-screen">
        <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <a href="/" className="font-display text-2xl tracking-tight text-papier">
            Récits
          </a>
          <nav className="flex gap-6 text-sm text-papier/70">
            <a href="/" className="hover:text-braise transition-colors">Romans</a>
            <a href="/communaute" className="hover:text-braise transition-colors">Communauté</a>
            <a href="/login" className="hover:text-braise transition-colors">Se connecter</a>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  )
}
