// Interprète une mise en forme simple à l'intérieur d'un paragraphe :
// **texte** ou #texte# -> gras, *texte* -> italique.
function InlineMarkdown({ texte }) {
  const jetons = texte.split(/(\*\*.+?\*\*|#.+?#|\*.+?\*)/g).filter((j) => j !== '')

  return (
    <>
      {jetons.map((jeton, i) => {
        if (/^\*\*.+\*\*$/.test(jeton)) return <strong key={i} className="font-semibold text-papier">{jeton.slice(2, -2)}</strong>
        if (/^#.+#$/.test(jeton)) return <strong key={i} className="font-semibold text-papier">{jeton.slice(1, -1)}</strong>
        if (/^\*.+\*$/.test(jeton)) return <em key={i}>{jeton.slice(1, -1)}</em>
        return <span key={i}>{jeton}</span>
      })}
    </>
  )
}

// Découpe le texte brut en paragraphes et applique une mise en forme littéraire cohérente,
// sans jamais dépendre des espaces tapés à la main par l'auteur.
// Une ligne de dialogue (qui commence par un tiret) démarre toujours un nouveau paragraphe,
// même si l'auteur a oublié de laisser une ligne vide devant.
function decouperEnParagraphes(texte) {
  const blocs = (texte || '').split(/\n\s*\n/)
  const paragraphes = []

  for (const bloc of blocs) {
    const lignes = bloc.split('\n').map((l) => l.trim()).filter(Boolean)
    let courant = ''

    for (const ligne of lignes) {
      const estDialogue = /^[—–-]\s/.test(ligne)
      const estSeparateur = /^(---+|\*\*\*+|___+)$/.test(ligne)
      if (estSeparateur) {
        if (courant) { paragraphes.push(courant); courant = '' }
        paragraphes.push('§SEPARATEUR§')
      } else if (estDialogue) {
        if (courant) paragraphes.push(courant)
        paragraphes.push(ligne)
        courant = ''
      } else {
        courant = courant ? `${courant} ${ligne}` : ligne
      }
    }
    if (courant) paragraphes.push(courant)
  }

  return paragraphes
}

export default function CorpsChapitre({ texte }) {
  const paragraphes = decouperEnParagraphes(texte)

  return (
    <div className="text-papier/85 text-[1.05rem] leading-[1.85] space-y-5 text-justify">
      {paragraphes.map((p, i) => {
        if (p === '§SEPARATEUR§') {
          return (
            <p key={i} className="text-center text-or/40 tracking-[0.5em] text-xs py-2" aria-hidden="true">
               · · ·
            </p>
          )
        }

        const estDialogue = /^[—–-]\s/.test(p)

        if (i === 0 && p.length > 0) {
          // Lettrine gérée manuellement (survit à la mise en forme imbriquée gras/italique)
          return (
            <p key={i}>
              <span className="font-display text-[4.2rem] font-semibold leading-[0.82] float-left pr-[0.09em]">
                {p.charAt(0)}
              </span>
              <InlineMarkdown texte={p.slice(1)} />
            </p>
          )
        }

        return (
          <p key={i} className={estDialogue ? 'pl-6' : ''}>
            <InlineMarkdown texte={p} />
          </p>
        )
      })}
    </div>
  )
}
