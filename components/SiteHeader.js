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
  <svg width="23" height="27" viewBox="0 0 359.483021 419.687528" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(-179.257351,431.764240) scale(0.100000,-0.100000)" fill="#0079db" stroke="none">
      <path d="M5223 4300 c-477 -61 -875 -188 -1230 -393 -357 -206 -517 -384 -622 -692 l-20 -60 -1 41 c0 53 42 219 69 273 12 22 18 41 13 41 -29 0 -306 -261 -436 -410 -276 -316 -382 -551 -403 -895 -5 -86 -8 -102 -14 -75 -15 67 -21 236 -11 320 6 47 9 87 7 89 -5 5 -87 -162 -118 -239 -81 -205 -110 -373 -108 -633 l1 -198 -64 -124 c-73 -141 -163 -279 -294 -449 -199 -257 -240 -398 -163 -561 74 -157 217 -222 466 -212 222 9 365 52 775 230 408 177 555 219 765 221 138 1 193 -9 277 -50 173 -86 118 -300 -93 -364 -112 -34 -121 -39 -74 -39 137 -2 292 93 323 197 62 206 -142 352 -473 339 -229 -9 -451 -79 -848 -266 -185 -87 -439 -171 -516 -171 -15 0 -11 8 17 37 60 65 77 114 76 228 -1 114 -14 160 -106 360 -61 132 -88 225 -88 302 0 56 64 197 196 430 515 916 1098 1622 1727 2095 96 71 86 60 -38 -47 -468 -401 -945 -990 -1364 -1685 -224 -373 -419 -745 -424 -809 -4 -58 17 -44 63 41 79 148 111 172 290 208 221 46 402 120 580 238 98 66 280 225 270 236 -3 3 -42 -8 -87 -24 -123 -43 -228 -60 -381 -60 -75 0 -132 4 -126 8 5 5 70 21 144 35 401 79 634 221 830 508 75 109 330 560 330 583 0 3 -15 -3 -32 -14 -106 -62 -295 -113 -458 -124 l-85 -6 110 34 c231 69 359 132 487 239 66 55 116 123 185 252 33 61 79 146 103 190 214 396 415 627 727 832 23 15 21 15 -154 -7z m-3143 -3482 c-44 -94 -60 -170 -60 -280 0 -88 -2 -98 -22 -112 -29 -20 -53 -6 -68 40 -24 72 28 216 129 354 24 33 45 60 47 60 2 0 -10 -28 -26 -62z" />
    </g>
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
    ...(connecte ? [{ href: '/', label: 'Accueil' }] : []),
    { href: '/romans', label: 'Romans' },
    { href: '/livres', label: 'Livres' },
    { href: '/contes-africains', label: 'Contes Africains' },
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
