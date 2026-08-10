'use client'

import { useEffect, useState } from 'react'

const ETAPES = [
  { cible: '[data-tour="logo"]', label: "C'est ici, chez toi", forme: 'ronde' },
  { cible: '[data-tour="stories"]', label: 'Les nouvelles du jour', forme: 'rect' },
  { cible: '[data-tour="menu-btn"]', label: 'Tout est ici', forme: 'ronde' },
]

export default function TourAccueil() {
  const [etape, setEtape] = useState(-1)
  const [cadre, setCadre] = useState(null)

  useEffect(() => {
    if (localStorage.getItem('encre_tour_vu')) return
    const t = setTimeout(() => setEtape(0), 700)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (etape < 0 || etape >= ETAPES.length) return

    function positionner() {
      const el = document.querySelector(ETAPES[etape].cible)
      if (!el) {
        suivant()
        return
      }
      el.scrollIntoView({ block: 'center', behavior: 'instant' })
      const r = el.getBoundingClientRect()
      setCadre({ top: r.top - 8, left: r.left - 8, width: r.width + 16, height: r.height + 16 })
    }

    const t = setTimeout(positionner, 150)
    window.addEventListener('resize', positionner)
    return () => { clearTimeout(t); window.removeEventListener('resize', positionner) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etape])

  function suivant() {
    if (etape + 1 >= ETAPES.length) terminer()
    else setEtape(etape + 1)
  }

  function terminer() {
    localStorage.setItem('encre_tour_vu', '1')
    setEtape(-1)
    setCadre(null)
  }

  if (etape < 0 || etape >= ETAPES.length || !cadre) return null

  const { label, forme } = ETAPES[etape]

  return (
    <div className="fixed inset-0 z-[100]" onClick={suivant}>
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="masque-tour">
            <rect width="100%" height="100%" fill="white" />
            {forme === 'ronde' ? (
              <circle cx={cadre.left + cadre.width / 2} cy={cadre.top + cadre.height / 2} r={Math.max(cadre.width, cadre.height) / 2} fill="black" />
            ) : (
              <rect x={cadre.left} y={cadre.top} width={cadre.width} height={cadre.height} rx="12" fill="black" />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.75)" mask="url(#masque-tour)" />
      </svg>

      <div
        className="absolute border-2 border-or rounded-full animate-pulse pointer-events-none"
        style={
          forme === 'ronde'
            ? { top: cadre.top, left: cadre.left, width: cadre.width, height: cadre.height, borderRadius: '9999px' }
            : { top: cadre.top, left: cadre.left, width: cadre.width, height: cadre.height, borderRadius: '12px' }
        }
      />

      <div
        className="absolute flex flex-col items-center gap-2"
        style={{ top: cadre.top + cadre.height + 14, left: Math.max(16, Math.min(cadre.left, window.innerWidth - 200)) }}
      >
        <span className="bg-or text-encre text-sm font-medium rounded-full px-4 py-2 shadow-lg whitespace-nowrap">
          {label}
        </span>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); terminer() }}
        className="absolute bottom-8 right-6 text-papier/50 text-xs font-mono underline"
      >
        Passer
      </button>
    </div>
  )
}
