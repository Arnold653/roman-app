import './globals.css'
import SiteHeader from '@/components/SiteHeader'
import TourAccueil from '@/components/TourAccueil'
import LienCompteFooter from '@/components/LienCompteFooter'

export const metadata = {
  title: 'Encre — lire, discuter, partager',
  description: 'Une nouvelle histoire chaque semaine, à lire et à discuter en communauté.',
  manifest: '/manifest.json',
  icons: { icon: '/favicon.svg', apple: '/icon-192.png' },
}

export const viewport = {
  themeColor: '#0d0f12',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="font-body min-h-screen flex flex-col">
        <SiteHeader />
        <TourAccueil />

        <main className="flex-1">{children}</main>

        <footer className="relative border-t border-ligne mt-24 overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.35] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(233,234,234,0.08) 1px, transparent 0)',
              backgroundSize: '22px 22px',
            }}
          />
          <div
            className="absolute inset-x-0 top-0 h-px pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(0,121,219,0.6), transparent)' }}
          />

          <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-10">
            <div className="grid md:grid-cols-[1.3fr_1fr_1fr_1fr] gap-12 mb-16">
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <svg width="22" height="24" viewBox="0 0 26 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M13 2C13 2 4.5 11.5 4.5 17.5C4.5 22.19 8.5 26 13.25 26C18 26 21.5 22.19 21.5 17.5C21.5 11.5 13 2 13 2Z"
                      fill="#0079db"
                    />
                  </svg>
                  <span className="font-display text-2xl text-papier">Encre</span>
                </div>
                <p className="text-papier/45 text-[0.95rem] leading-relaxed max-w-xs mb-6">
                  Des histoires écrites avec soin, pensées pour se lire lentement — et se partager.
                </p>
                <div className="flex items-center gap-3">
                  <a href="https://wa.me/" aria-label="WhatsApp" className="w-9 h-9 rounded-full border border-ligne flex items-center justify-center text-papier/50 hover:text-or hover:border-or/40 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.2h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.87 9.87 0 0 0 12.04 2m0 1.67a8.2 8.2 0 0 1 5.83 2.42 8.18 8.18 0 0 1 2.41 5.82c0 4.55-3.7 8.25-8.25 8.25a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.38c0-4.55 3.71-8.25 8.26-8.25" /></svg>
                  </a>
                  <a href="mailto:contact@encre.app" aria-label="Email" className="w-9 h-9 rounded-full border border-ligne flex items-center justify-center text-papier/50 hover:text-or hover:border-or/40 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18v12H3z" strokeLinejoin="round" /><path d="M3 7l9 6 9-6" strokeLinejoin="round" /></svg>
                  </a>
                </div>
              </div>

              <div className="font-mono text-xs uppercase tracking-wide">
                <p className="text-papier/30 mb-4">Explorer</p>
                <ul className="space-y-3 text-papier/55">
                  <li><a href="/" className="hover:text-or transition-colors">Accueil</a></li>
                  <li><a href="/romans" className="hover:text-or transition-colors">Romans</a></li>
                  <li><a href="/fil" className="hover:text-or transition-colors">Fil</a></li>
                  <li><a href="/communaute" className="hover:text-or transition-colors">Communauté</a></li>
                  <li><a href="/lecteurs" className="hover:text-or transition-colors">Découvrir</a></li>
                </ul>
              </div>

              <div className="font-mono text-xs uppercase tracking-wide">
                <p className="text-papier/30 mb-4">Compte</p>
                <ul className="space-y-3 text-papier/55">
                  <LienCompteFooter />
                  <li><a href="/messages" className="hover:text-or transition-colors">Messages</a></li>
                </ul>
              </div>

              <div>
                <p className="font-mono text-xs uppercase tracking-wide text-papier/30 mb-4">Sur ton téléphone</p>
                <div className="rounded-xl border border-or/25 bg-gradient-to-br from-or/10 to-transparent p-4">
                  <div className="w-9 h-9 rounded-full bg-or/15 flex items-center justify-center mb-3">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0079db" strokeWidth="2">
                      <path d="M12 3v13m0 0l-4-4m4 4l4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-papier text-sm font-medium leading-snug">Installe l'app Encre</p>
                  <p className="text-papier/40 text-xs mt-1 leading-relaxed">Menu du navigateur → « Ajouter à l'écran d'accueil »</p>
                </div>
              </div>
            </div>

            <div className="border-t border-ligne pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-papier/30 font-mono">
              <span>© {new Date().getFullYear()} Encre — écrit avec soin</span>
              <span>Un nouveau chapitre chaque semaine</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
