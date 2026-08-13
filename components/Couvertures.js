export function CouvertureGeneree({ id, titre }) {
  const initiale = (titre || '?').trim().charAt(0).toUpperCase()
  return (
    <>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(115deg, rgba(255,255,255,0.14) 0%, transparent 28%, transparent 72%, rgba(255,255,255,0.05) 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 30%, transparent 45%, rgba(0,0,0,0.35) 100%)' }} />
      <div className="absolute inset-x-0 bottom-0 h-2/5" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)' }} />
      <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)', backgroundSize: '3px 3px' }} />
      <span className="font-display absolute right-4 top-4 text-[2.4rem] leading-none text-papier/[0.16] select-none pointer-events-none italic" aria-hidden="true" style={{ WebkitTextStroke: '1px rgba(233,234,234,0.22)' }}>
        {initiale}
      </span>
      <div className="absolute inset-[6px] border border-papier/[0.12] pointer-events-none" />
      <div className="absolute left-5 top-5 w-8 h-[1.5px] bg-papier/40" />
    </>
  )
}

// Couverture des livres (non-fiction / PDF) : plus sobre que celle des romans, avec une
// tranche colorée en bordure gauche façon reliure, pour rester visuellement distincte
// du rayon "Romans" au premier coup d'œil.
export function CouvertureLivre({ titre }) {
  const initiale = (titre || '?').trim().charAt(0).toUpperCase()
  return (
    <>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #26292d 0%, #17191c 60%, #0d0f12 100%)' }} />
      <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-or/50" />
      <div className="absolute inset-0 opacity-[0.12] mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)', backgroundSize: '3px 3px' }} />
      <span className="font-display absolute right-4 top-4 text-[2.4rem] leading-none text-papier/[0.14] select-none pointer-events-none italic" aria-hidden="true">
        {initiale}
      </span>
      <div className="absolute inset-[6px] border border-papier/[0.1] pointer-events-none" />
    </>
  )
}
