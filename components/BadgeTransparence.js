export default function BadgeTransparence({ generePar = true, verifiePar }) {
  if (!generePar && !verifiePar) return null

  return (
    <div className="inline-flex items-center gap-1.5 text-[0.7rem] font-mono text-papier/40 border border-ligne rounded-full px-3 py-1.5">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2l2.4 6.8L21 11l-6.6 2.2L12 20l-2.4-6.8L3 11l6.6-2.2z" strokeLinejoin="round" />
      </svg>
      <span>
        Généré avec l'aide de l'IA
        {verifiePar ? ` · Vérifié par ${verifiePar}` : ''}
      </span>
    </div>
  )
}
