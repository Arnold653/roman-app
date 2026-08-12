'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

function decouper(msRestant) {
  const total = Math.max(0, Math.floor(msRestant / 1000))
  return {
    jours: Math.floor(total / 86400),
    heures: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    secondes: total % 60,
  }
}

function FondCouverture({ couvertureUrl, degrade, titre }) {
  const initiale = (titre || '?').trim().charAt(0).toUpperCase()
  return (
    <>
      {couvertureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={couvertureUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(160deg, ${degrade?.[0] || '#1c9bf0'} 0%, ${degrade?.[1] || '#0b3a6b'} 55%, ${degrade?.[2] || '#050b16'} 100%)` }}
        />
      )}
      <span
        className="font-display absolute right-3 bottom-1 text-[7rem] leading-none text-papier/[0.08] select-none pointer-events-none italic"
        aria-hidden="true"
      >
        {initiale}
      </span>
      {/* voile sombre pour garder le texte lisible par-dessus la couverture/le dégradé */}
      <div className="absolute inset-0 bg-gradient-to-t from-encre via-encre/75 to-encre/35" />
      <div
        className="absolute inset-0 opacity-[0.15] mix-blend-overlay"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)', backgroundSize: '3px 3px' }}
      />
    </>
  )
}

function PastilleEnDirect() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-or opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-or" />
    </span>
  )
}

// Affichée avant la sortie d'un chapitre programmé ("Première"). Deux formats :
// - complet (page du roman) : grande carte habillée de la couverture du roman.
// - compact (accueil) : carte de largeur fixe dans une bande horizontale, cliquable.
// À zéro : appelle /api/premiere/verifier (publication + notifications côté serveur) puis
// rafraîchit, sans attendre le cron quotidien.
export default function CompteAReboursPremiere({
  publieLe,
  numero,
  titre,
  romanTitre,
  romanSlug,
  couvertureUrl,
  degrade,
  compact = false,
  brouillon = false,
}) {
  const router = useRouter()
  const cible = new Date(publieLe).getTime()
  const [msRestant, setMsRestant] = useState(cible - Date.now())
  const [declenche, setDeclenche] = useState(false)

  useEffect(() => {
    const intervalle = setInterval(() => setMsRestant(cible - Date.now()), 1000)
    return () => clearInterval(intervalle)
  }, [cible])

  useEffect(() => {
    if (msRestant > 0 || declenche) return
    setDeclenche(true)
    fetch('/api/premiere/verifier')
      .catch(() => {})
      .finally(() => setTimeout(() => router.refresh(), 800))
  }, [msRestant, declenche, router])

  const { jours, heures, minutes, secondes } = decouper(msRestant)
  const sorti = msRestant <= 0

  // --- Format compact : bande de l'accueil ---
  if (compact) {
    const Conteneur = romanSlug ? 'a' : 'div'
    return (
      <Conteneur
        href={romanSlug ? `/roman/${romanSlug}` : undefined}
        className="group shrink-0 w-[220px] relative rounded-xl overflow-hidden border border-or/25 hover:border-or/50 transition-colors"
        style={{ scrollSnapAlign: 'start' }}
      >
        <div className="relative h-[132px]">
          <FondCouverture couvertureUrl={couvertureUrl} degrade={degrade} titre={romanTitre} />
          <div className="relative h-full p-4 flex flex-col justify-between">
            <span className="inline-flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-or">
              <PastilleEnDirect />
              {sorti ? "C'est sorti" : 'Première'}
            </span>
            {brouillon && (
              <span className="absolute top-3 right-3 font-mono text-[0.55rem] uppercase tracking-widest text-grenat border border-papier/20 rounded-full px-2 py-0.5 bg-encre/60">
                Brouillon
              </span>
            )}
            <div>
              <h3 className="font-display text-base text-papier leading-tight mb-1.5 line-clamp-1">{romanTitre}</h3>
              {sorti ? (
                <p className="font-mono text-xs text-or">Lire maintenant →</p>
              ) : (
                <p className="font-mono text-sm text-papier tabular-nums">
                  {jours > 0 && `${jours}j `}
                  {String(heures).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(secondes).padStart(2, '0')}
                </p>
              )}
            </div>
          </div>
        </div>
      </Conteneur>
    )
  }

  // --- Format complet : page du roman ---
  if (sorti) {
    return (
      <div className="relative mt-12 rounded-2xl overflow-hidden border border-or/40 lever">
        <div className="relative min-h-[160px]">
          <FondCouverture couvertureUrl={couvertureUrl} degrade={degrade} titre={romanTitre} />
          <div className="relative px-6 py-10 text-center">
            <span className="inline-flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-or mb-3">
              <PastilleEnDirect />
              C'est sorti
            </span>
            <p className="font-display text-2xl text-papier">Le chapitre {numero} arrive…</p>
          </div>
        </div>
      </div>
    )
  }

  const unites = [
    { valeur: jours, label: 'jours' },
    { valeur: heures, label: 'heures' },
    { valeur: minutes, label: 'min' },
    { valeur: secondes, label: 'sec' },
  ]

  return (
    <div className="relative mt-12 rounded-2xl overflow-hidden border border-or/25 shadow-[0_0_40px_-12px_rgba(0,121,219,0.35)]">
      <div className="relative min-h-[280px]">
        <FondCouverture couvertureUrl={couvertureUrl} degrade={degrade} titre={romanTitre} />
        <div className="relative px-6 py-10 text-center">
          <span className="inline-flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-or mb-4">
            <PastilleEnDirect />
            Première à venir
          </span>
          {romanTitre && (
            <p className="font-mono text-[0.65rem] uppercase tracking-widest text-papier/45 mb-1.5">{romanTitre}</p>
          )}
          <h3 className="font-display text-2xl md:text-3xl text-papier mb-8">
            {titre ? titre : `Chapitre ${numero}`}
          </h3>
          <div className="flex items-stretch justify-center gap-3 md:gap-4">
            {unites.map((u, i) => (
              <div key={u.label} className="flex items-center">
                <div className="flex flex-col items-center bg-encre/50 backdrop-blur-sm border border-papier/10 rounded-lg px-4 py-3 md:px-5 md:py-4 min-w-[64px] md:min-w-[76px]">
                  <span className="font-display text-3xl md:text-4xl text-papier tabular-nums leading-none">
                    {String(u.valeur).padStart(2, '0')}
                  </span>
                  <span className="font-mono text-[0.58rem] uppercase tracking-widest text-papier/40 mt-1.5">
                    {u.label}
                  </span>
                </div>
                {i < unites.length - 1 && (
                  <span className="font-display text-2xl text-papier/20 mx-1 md:mx-1.5 self-start mt-3">:</span>
                )}
              </div>
            ))}
          </div>
          <p className="font-mono text-[0.68rem] text-papier/35 mt-6">
            Notification automatique dès la sortie — pas besoin de rester sur la page.
          </p>
        </div>
      </div>
    </div>
  )
}
