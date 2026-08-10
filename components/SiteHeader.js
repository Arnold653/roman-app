'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ClocheNotifications from '@/components/ClocheNotifications'

export default function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [statut, setStatut] = useState({ loading: true, user: null, isAdmin: false })

  const supabase = createClient()

  async function chargerStatut() {
    const res = await fetch('/api/me')
    const data = await res.json()
    setStatut({ loading: false, user: data.user, isAdmin: data.isAdmin })
  }

  useEffect(() => {
    chargerStatut()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      chargerStatut()
    })
    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function deconnexion() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const nomAffiche = statut.user?.pseudo || statut.user?.email?.split('@')[0]

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-encre/80 border-b border-ligne">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5 group">
          <svg width="24" height="26" viewBox="0 0 26 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M13 2C13 2 4.5 11.5 4.5 17.5C4.5 22.19 8.5 26 13.25 26C18 26 21.5 22.19 21.5 17.5C21.5 11.5 13 2 13 2Z"
              fill="#0079db"
              className="transition-transform duration-300 group-hover:scale-105"
            />
            <path
              d="M9.8 15.5C9.8 12.8 11.6 10.2 13.4 8"
              stroke="#e9eaea"
              strokeOpacity="0.35"
              strokeWidth="1.3"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <span className="font-display text-[1.4rem] tracking-tight text-papier">Encre</span>
        </a>

        {/* Nav complète — visible seulement à partir des écrans moyens */}
        <nav className="hidden sm:flex items-center gap-8 text-sm text-papier/60 font-mono uppercase tracking-wide">
          <a href="/" className="hover:text-or transition-colors">Romans</a>
          <a href="/communaute" className="hover:text-or transition-colors">Communauté</a>
          <a href="/lecteurs" className="hover:text-or transition-colors">Découvrir</a>

          {statut.isAdmin && (
            <a href="/admin" className="hover:text-or transition-colors">Admin</a>
          )}

          {!statut.loading && statut.user ? (
            <div className="flex items-center gap-4 normal-case font-body tracking-normal">
              <a href={`/profil/${nomAffiche}`} className="text-papier/50 hover:text-or transition-colors text-[0.9rem]">{nomAffiche}</a>
              <button
                onClick={deconnexion}
                className="text-papier border border-papier/20 rounded-full px-4 py-1.5 hover:border-or hover:text-or transition-colors text-[0.9rem]"
              >
                Se déconnecter
              </button>
            </div>
          ) : (
            !statut.loading && (
              <a
                href="/login"
                className="text-papier border border-papier/20 rounded-full px-4 py-1.5 hover:border-or hover:text-or transition-colors normal-case font-body tracking-normal text-[0.9rem]"
              >
                Se connecter
              </a>
            )
          )}
        </nav>

        <div className="flex items-center gap-1">
          <ClocheNotifications connecte={!statut.loading && !!statut.user} />

          {/* Bouton menu — mobile uniquement */}
          <button
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={open}
            className="sm:hidden text-papier p-1.5"
          >
            {open ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M6 6l12 12M18 6l-12 12" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Menu déroulant — mobile uniquement */}
      {open && (
        <nav className="sm:hidden border-t border-ligne px-6 py-5 flex flex-col gap-4 font-mono uppercase tracking-wide text-sm text-papier/70">
          <a href="/" onClick={() => setOpen(false)} className="hover:text-or transition-colors">Romans</a>
          <a href="/communaute" onClick={() => setOpen(false)} className="hover:text-or transition-colors">Communauté</a>

          {statut.isAdmin && (
            <a href="/admin" onClick={() => setOpen(false)} className="hover:text-or transition-colors">Admin</a>
          )}

          <a href="/lecteurs" onClick={() => setOpen(false)} className="hover:text-or transition-colors">Découvrir</a>

          {!statut.loading && statut.user ? (
            <>
              <a
                href={`/profil/${nomAffiche}`}
                onClick={() => setOpen(false)}
                className="normal-case font-body tracking-normal text-papier/80 text-[0.95rem] flex items-center gap-2"
              >
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-or to-[#0a1a2e] flex items-center justify-center text-[0.65rem] font-display text-papier shrink-0">
                  {nomAffiche?.charAt(0).toUpperCase()}
                </span>
                Voir mon profil
              </a>
              <button
                onClick={deconnexion}
                className="text-encre bg-or rounded-full px-4 py-2.5 text-center normal-case font-body tracking-normal text-[0.95rem] mt-1"
              >
                Se déconnecter
              </button>
            </>
          ) : (
            !statut.loading && (
              <a
                href="/login"
                onClick={() => setOpen(false)}
                className="text-encre bg-or rounded-full px-4 py-2.5 text-center normal-case font-body tracking-normal text-[0.95rem] mt-1"
              >
                Se connecter
              </a>
            )
          )}
        </nav>
      )}
    </header>
  )
}
