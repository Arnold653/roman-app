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
      if (estDialogue) {
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
