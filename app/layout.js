import './globals.css'
import SiteHeader from '@/components/SiteHeader'

export const metadata = {
  title: 'Encre — lire, discuter, partager',
  description: 'Une nouvelle histoire chaque semaine, à lire et à discuter en communauté.',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="font-body min-h-screen flex flex-col">
        <SiteHeader />

        <main className="flex-1">{children}</main>

        <footer className="border-t border-ligne mt-24 bg-encreClair/40">
          <div className="max-w-6xl mx-auto px-6 py-14 grid sm:grid-cols-3 gap-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <svg width="18" height="20" viewBox="0 0 26 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M13 2C13 2 4.5 11.5 4.5 17.5C4.5 22.19 8.5 26 13.25 26C18 26 21.5 22.19 21.5 17.5C21.5 11.5 13 2 13 2Z"
                    fill="#0079db"
                  />
                </svg>
                <span className="font-display text-lg text-papier">Encre</span>
              </div>
              <p className="text-papier/40 text-sm leading-relaxed max-w-xs">
                Une nouvelle histoire chaque semaine, à lire et à discuter en communauté.
              </p>
            </div>

            <div className="font-mono text-xs uppercase tracking-wide">
              <p className="text-papier/30 mb-3">Explorer</p>
              <ul className="space-y-2.5 text-papier/55">
                <li><a href="/" className="hover:text-or transition-colors">Romans</a></li>
                <li><a href="/communaute" className="hover:text-or transition-colors">Communauté</a></li>
                <li><a href="/login" className="hover:text-or transition-colors">Se connecter</a></li>
              </ul>
            </div>

            <div className="font-mono text-xs uppercase tracking-wide">
              <p className="text-papier/30 mb-3">Encre</p>
              <p className="text-papier/40 normal-case font-body tracking-normal leading-relaxed">
                Écrit avec soin, pensé pour se lire lentement.
              </p>
            </div>
          </div>

          <div className="border-t border-ligne">
            <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-papier/30 font-mono">
              <span>© {new Date().getFullYear()} Encre</span>
              <span>Une histoire chaque semaine</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
