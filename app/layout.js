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

        <footer className="border-t border-ligne mt-24">
          <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-papier/35 font-mono">
            <span>Encre — une histoire chaque semaine</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </footer>
      </body>
    </html>
  )
}
