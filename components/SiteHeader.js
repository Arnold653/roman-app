'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ClocheNotifications from '@/components/ClocheNotifications'
import IconeMessages from '@/components/IconeMessages'

function Avatar({ nom, url, taille = 'w-8 h-8', texte = 'text-xs' }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={nom} className={`${taille} rounded-full object-cover shrink-0`} />
  }
  return (
    <div className={`${taille} rounded-full bg-gradient-to-br from-or to-[#0a1a2e] flex items-center justify-center shrink-0`}>
      <span className={`font-display ${texte} text-papier`}>{nom?.charAt(0).toUpperCase()}</span>
    </div>
  )
}

const Logo = () => (
  <svg width="24" height="26" viewBox="0 0 26 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M13 2C13 2 4.5 11.5 4.5 17.5C4.5 22.19 8.5 26 13.25 26C18 26 21.5 22.19 21.5 17.5C21.5 11.5 13 2 13 2Z"
      fill="#0079db"
    />
    <path d="M9.8 15.5C9.8 12.8 11.6 10.2 13.4 8" stroke="#e9eaea" strokeOpacity="0.35" strokeWidth="1.3" strokeLinecap="round" fill="none" />
  </svg>
)

export default function SiteHeader() {
  const [tiroirOuvert, setTiroirOuvert] = useState(false)
  const [statut, setStatut] = useState({ loading: true, user: null, isAdmin: false })

  const supabase = createClient()

  async function chargerStatut() {
    const res = await fetch('/api/me')
    const data = await res.json()
    setStatut({ loading: false, user: data.user, isAdmin: data.isAdmin })
  }

  useEffect(() => {
    chargerStatut()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => chargerStatut())
    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    document.body.style.overflow = tiroirOuvert ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [tiroirOuvert])

  async function deconnexion() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const nomAffiche = statut.user?.pseudo || statut.user?.email?.split('@')[0]
  const connecte = !statut.loading && !!statut.user

  const liensNav = [
    { href: '/romans', label: 'Romans' },
    { href: '/livres', label: 'Livres' },
    ...(connecte ? [{ href: '/fil', label: 'Fil' }] : []),
    { href: '/communaute', label: 'Communauté' },
    { href: '/lecteurs', label: 'Découvrir' },
    ...(statut.isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-encre/85 border-b border-ligne">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 shrink-0" data-tour="logo">
            <Logo />
            <span className="font-display text-[1.35rem] tracking-tight text-papier">Encre</span>
          </a>

          <nav className="hidden md:flex items-center gap-7 text-[0.8rem] text-papier/55 font-mono uppercase tracking-wide">
            {liensNav.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-or transition-colors">{l.label}</a>
            ))}
          </nav>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <IconeMessages connecte={connecte} />
            <ClocheNotifications connecte={connecte} />

            {connecte ? (
              <a href={`/profil/${nomAffiche}`} className="ml-1 sm:ml-2 ring-1 ring-transparent hover:ring-or/50 rounded-full transition-all">
                <Avatar nom={nomAffiche} url={statut.user?.avatar_url} taille="w-8 h-8" />
              </a>
            ) : (
              !statut.loading && (
                <a href="/login" className="hidden sm:block ml-2 text-papier border border-papier/20 rounded-full px-4 py-1.5 hover:border-or hover:text-or transition-colors text-sm">
                  Se connecter
                </a>
              )
            )}

            <button
              onClick={() => setTiroirOuvert(true)}
              aria-label="Menu"
              data-tour="menu-btn"
              className="p-1.5 ml-0.5 text-papier/80 hover:text-or transition-colors"
            >
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${tiroirOuvert ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/60" onClick={() => setTiroirOuvert(false)} />
        <div className={`absolute right-0 top-0 bottom-0 w-[82%] max-w-xs bg-encreClair border-l border-ligne flex flex-col transition-transform duration-300 ${tiroirOuvert ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between px-5 h-16 border-b border-ligne shrink-0">
            <span className="font-display text-lg text-papier">Menu</span>
            <button onClick={() => setTiroirOuvert(false)} aria-label="Fermer" className="p-1.5 text-papier/60">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M6 6l12 12M18 6l-12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {connecte && (
            <a href={`/profil/${nomAffiche}`} onClick={() => setTiroirOuvert(false)} className="flex items-center gap-3 px-5 py-5 border-b border-ligne hover:bg-encre/40 transition-colors">
              <Avatar nom={nomAffiche} url={statut.user?.avatar_url} taille="w-12 h-12" texte="text-lg" />
              <div className="min-w-0">
                <p className="font-display text-lg text-papier truncate">{nomAffiche}</p>
                <p className="text-papier/40 text-xs font-mono">Voir le profil</p>
              </div>
            </a>
          )}

          <nav className="flex-1 overflow-y-auto py-3">
            {liensNav.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setTiroirOuvert(false)} className="flex items-center px-5 py-3.5 text-papier/75 hover:bg-encre/40 hover:text-or transition-colors text-[0.95rem]">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="px-5 py-5 border-t border-ligne shrink-0">
            {connecte ? (
              <button onClick={deconnexion} className="w-full text-encre bg-or rounded-full px-4 py-3 text-center font-medium text-sm hover:brightness-110 transition-all">
                Se déconnecter
              </button>
            ) : (
              !statut.loading && (
                <a href="/login" onClick={() => setTiroirOuvert(false)} className="block w-full text-encre bg-or rounded-full px-4 py-3 text-center font-medium text-sm hover:brightness-110 transition-all">
                  Se connecter
                </a>
              )
            )}
          </div>
        </div>
      </div>
    </>
  )
}
