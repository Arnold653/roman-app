import './globals.css'

export const metadata = {
  title: 'Encre — lire, discuter, partager',
  description: 'Une nouvelle histoire chaque semaine, à lire et à discuter en communauté.',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="font-body min-h-screen">
        <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M13 2C13 2 5 10.5 5 16.5C5 20.6421 8.35786 24 12.5 24C13 24 13 24 13 24C13 24 13 24 13.5 24C17.6421 24 21 20.6421 21 16.5C21 10.5 13 2 13 2Z"
                fill="#c76b3f"
              />
              <path d="M13 8C13 8 9 13 9 16.5C9 18.9853 11.0147 21 13.5 21" stroke="#12141c" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.5" />
            </svg>
            <span className="font-display text-2xl tracking-tight text-papier">Encre</span>
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
