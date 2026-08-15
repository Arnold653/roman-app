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

// Style par niveau de titre, du plus structurant (1 = Partie) au plus fin (6) : les niveaux 1
// et 2 restent la grande typo display centrée (rupture de page), les sous-titres (3-4) une typo
// display plus modeste alignée à gauche, et les plus profonds (5-6) une étiquette mono
// majuscule — cohérent avec le traitement des métadonnées ailleurs dans l'app (cf. design
// system : font-mono uppercase tracking-widest).
const STYLES_TITRE = {
  1: 'font-display text-[1.85rem] text-papier text-center pt-10 pb-2 tracking-wide',
  2: 'font-display text-2xl text-papier text-center pt-6 pb-1 tracking-wide',
  3: 'font-display text-xl text-papier/90 pt-5 pb-1 tracking-wide',
  4: 'font-display text-lg text-papier/80 font-medium pt-4 pb-1',
  5: 'font-mono text-xs uppercase tracking-widest text-or/80 pt-4 pb-1',
  6: 'font-mono text-[0.7rem] uppercase tracking-widest text-papier/45 pt-3 pb-1',
}

// Découpe le texte brut en paragraphes et applique une mise en forme littéraire cohérente,
// sans jamais dépendre des espaces tapés à la main par l'auteur.
// Une ligne de dialogue (qui commence par un tiret) démarre toujours un nouveau paragraphe,
// même si l'auteur a oublié de laisser une ligne vide devant.
export function decouperEnParagraphes(texte) {
  const blocs = (texte || '').split(/\n\s*\n/)
  const paragraphes = []

  for (const bloc of blocs) {
    const lignes = bloc.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lignes.length === 0) continue

    // Bloc de citation : toutes les lignes du bloc commencent par ">" (convention Markdown,
    // produite par lib/paragraphesVersMarkdown.js à partir d'une citation détectée à
    // l'extraction, ou tapée à la main dans le contenu d'un chapitre).
    if (lignes.every((l) => /^>\s?/.test(l))) {
      const contenu = lignes.map((l) => l.replace(/^>\s?/, '')).join(' ')
      paragraphes.push('§CITATION§' + contenu)
      continue
    }

    // Sous-titre Markdown ("#" à "######"), produit par lib/paragraphesVersMarkdown.js à partir
    // d'un titre détecté à l'extraction, ou tapé à la main dans le contenu d'un chapitre.
    if (lignes.length === 1) {
      const mTitre = lignes[0].match(/^(#{1,6})\s+(.+)$/)
      if (mTitre) {
        paragraphes.push(`§TITRE${mTitre[1].length}§${mTitre[2].trim()}`)
        continue
      }
    }

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

export default function CorpsChapitre({ texte, tailleGrande = false }) {
  const paragraphes = decouperEnParagraphes(texte)

  return (
    <div className={tailleGrande
      ? 'text-papier/90 text-[1.35rem] leading-[2] space-y-6 text-left'
      : 'text-papier/85 text-[1.05rem] leading-[1.85] space-y-5 text-justify'
    }>
      {paragraphes.map((p, i) => {
        if (p === '§SEPARATEUR§') {
          return (
            <p key={i} id={`p-${i}`} className="text-center text-or/40 tracking-[0.5em] text-xs py-2" aria-hidden="true">
               · · ·
            </p>
          )
        }

        // §TITRE1§ à §TITRE6§ (cf. decouperEnParagraphes et components/LecteurPDF.js). Le
        // marqueur historique sans chiffre ("§TITRE§") est encore accepté par sécurité et
        // traité comme un niveau 2 (Chapitre), son usage d'origine.
        const mTitre = p.match(/^§TITRE(\d)?§/)
        if (mTitre) {
          const niveau = mTitre[1] ? Number(mTitre[1]) : 2
          return (
            <p key={i} id={`p-${i}`} className={STYLES_TITRE[niveau] || STYLES_TITRE[2]}>
              <InlineMarkdown texte={p.slice(mTitre[0].length)} />
            </p>
          )
        }

        if (p.startsWith('§CITATION§')) {
          return (
            <blockquote
              key={i}
              id={`p-${i}`}
              className="my-2 py-1 pl-5 border-l-2 border-or/40 font-display italic text-papier/65 text-[1.02rem] leading-[1.75]"
            >
              <InlineMarkdown texte={p.slice('§CITATION§'.length)} />
            </blockquote>
          )
        }

        if (p.startsWith('§IMAGE§')) {
          const url = p.slice('§IMAGE§'.length)
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} id={`p-${i}`} src={url} alt="" className={tailleGrande ? 'w-full rounded-2xl shadow-lg my-2' : 'w-full rounded-lg'} loading="lazy" />
          )
        }

        if (p.startsWith('§TABLEAU§')) {
          let lignesTableau = []
          try { lignesTableau = JSON.parse(p.slice('§TABLEAU§'.length)) } catch { lignesTableau = [] }
          return (
            <div key={i} id={`p-${i}`} className="overflow-x-auto -mx-1">
              <table className="w-full text-sm border-collapse">
                <tbody>
                  {lignesTableau.map((ligne, r) => (
                    <tr key={r} className={r === 0 ? 'border-b border-or/30' : 'border-b border-ligne/40'}>
                      {ligne.map((cellule, c) => (
                        <td key={c} className={`px-2 py-1.5 align-top ${r === 0 ? 'text-papier/90 font-medium' : 'text-papier/70'}`}>
                          {cellule}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }

        const estDialogue = /^[—–-]\s/.test(p)

        if (i === 0 && p.length > 0) {
          // Lettrine gérée manuellement (survit à la mise en forme imbriquée gras/italique)
          return (
            <p key={i} id={`p-${i}`}>
              <span className="font-display text-[4.2rem] font-semibold leading-[0.82] float-left pr-[0.09em]">
                {p.charAt(0)}
              </span>
              <InlineMarkdown texte={p.slice(1)} />
            </p>
          )
        }

        return (
          <p key={i} id={`p-${i}`} className={estDialogue ? 'pl-6' : ''}>
            <InlineMarkdown texte={p} />
          </p>
        )
      })}
    </div>
  )
}
