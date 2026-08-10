// Découpe le texte brut en paragraphes et applique une mise en forme littéraire cohérente,
// sans jamais dépendre des espaces tapés à la main par l'auteur.
export default function CorpsChapitre({ texte }) {
  const paragraphes = (texte || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <div className="text-papier/85 text-[1.05rem] leading-[1.85] space-y-5">
      {paragraphes.map((p, i) => {
        const estDialogue = /^[—–-]\s/.test(p)
        return (
          <p
            key={i}
            className={i === 0 ? 'lettrine' : estDialogue ? 'pl-6' : ''}
          >
            {p}
          </p>
        )
      })}
    </div>
  )
}
