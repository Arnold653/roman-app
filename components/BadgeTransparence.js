export default function BadgeTransparence({ generePar = true, verifiePar }) {
  if (!generePar && !verifiePar) return null

  return (
    <div
      className={`inline-flex gap-1.5 text-[0.7rem] font-mono text-papier/40 border border-ligne px-3 py-1.5 ${
        verifiePar ? 'items-start rounded-xl' : 'items-center rounded-full'
      }`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={verifiePar ? 'mt-0.5 shrink-0' : 'shrink-0'}>
        <path d="M12 2l2.4 6.8L21 11l-6.6 2.2L12 20l-2.4-6.8L3 11l6.6-2.2z" strokeLinejoin="round" />
      </svg>
      <span>
        Rédigé avec l'aide de l'IA
        {verifiePar && <><br />Vérifié par {verifiePar}</>}
      </span>
    </div>
  )
}
