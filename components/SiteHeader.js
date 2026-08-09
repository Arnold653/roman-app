'use client'

import { useState } from 'react'

export default function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-encre/80 border-b border-ligne">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5 group">
          <svg width="24" height="24" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M13 2C13 2 5 10.5 5 16.5C5 20.6421 8.35786 24 12.5 24C13 24 13 24 13 24C13 24 13 24 13.5 24C17.6421 24 21 20.6421 21 16.5C21 10.5 13 2 13 2Z"
              fill="#c9962b"
              className="transition-transform duration-300 group-hover:scale-105"
            />
          </svg>
          <span className="font-display text-[1.4rem] tracking-tight text-papier">Encre</span>
        </a>

        {/* Nav complète — visible seulement à partir des écrans moyens */}
        <nav className="hidden sm:flex items-center gap-8 text-sm text-papier/60 font-mono uppercase tracking-wide">
          <a href="/" className="hover:text-or transition-colors">Romans</a>
          <a href="/communaute" className="hover:text-or transition-colors">Communauté</a>
          <a
            href="/login"
            className="text-papier border border-papier/20 rounded-full px-4 py-1.5 hover:border-or hover:text-or transition-colors normal-case font-body tracking-normal text-[0.9rem]"
          >
            Se connecter
          </a>
        </nav>

        {/* Bouton menu — mobile uniquement */}
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={open}
          className="sm:hidden text-papier p-1.5 -mr-1.5"
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

      {/* Menu déroulant — mobile uniquement */}
      {open && (
        <nav className="sm:hidden border-t border-ligne px-6 py-5 flex flex-col gap-4 font-mono uppercase tracking-wide text-sm text-papier/70">
          <a href="/" onClick={() => setOpen(false)} className="hover:text-or transition-colors">Romans</a>
          <a href="/communaute" onClick={() => setOpen(false)} className="hover:text-or transition-colors">Communauté</a>
          <a
            href="/login"
            onClick={() => setOpen(false)}
            className="text-encre bg-or rounded-full px-4 py-2.5 text-center normal-case font-body tracking-normal text-[0.95rem] mt-1"
          >
            Se connecter
          </a>
        </nav>
      )}
    </header>
  )
}
