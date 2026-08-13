// Extraction pour les fichiers .epub — un EPUB est un zip contenant un manifeste OPF qui liste
// les fichiers XHTML du livre et leur ordre de lecture (le "spine"). On suit cet ordre, on
// parcourt chaque fichier XHTML, et on reconstruit la même structure de paragraphes que les
// autres extracteurs (extractionPdf.js, extractionTexte.js, extractionDocx.js) pour réutiliser
// telle quelle la logique de découpage en sections (decouperEnSections).
import JSZip from 'jszip'
import { decouperEnSections, niveauTitre, ressembleACitationAutonome } from './extractionCommune'

function resoudreChemin(base, relatif) {
  if (!base) return relatif
  const pile = base.split('/').slice(0, -1)
  for (const segment of relatif.split('/')) {
    if (segment === '.' || segment === '') continue
    if (segment === '..') pile.pop()
    else pile.push(segment)
  }
  return pile.join('/')
}

export async function extraireEpub(arrayBuffer, onProgression) {
  const zip = await JSZip.loadAsync(arrayBuffer)

  const containerXml = await zip.file('META-INF/container.xml')?.async('string')
  if (!containerXml) throw new Error('Fichier EPUB invalide (container.xml introuvable).')
  const container = new DOMParser().parseFromString(containerXml, 'application/xml')
  const cheminOpf = container.querySelector('rootfile')?.getAttribute('full-path')
  if (!cheminOpf) throw new Error('Fichier EPUB invalide (rootfile introuvable).')

  const opfXml = await zip.file(cheminOpf).async('string')
  const opf = new DOMParser().parseFromString(opfXml, 'application/xml')

  const manifeste = {}
  opf.querySelectorAll('manifest > item').forEach((item) => {
    manifeste[item.getAttribute('id')] = item.getAttribute('href')
  })
  const ordreLecture = [...opf.querySelectorAll('spine > itemref')]
    .map((ref) => manifeste[ref.getAttribute('idref')])
    .filter(Boolean)

  if (ordreLecture.length === 0) throw new Error("Fichier EPUB invalide (aucun contenu dans le spine).")

  const paragraphes = []
  for (let i = 0; i < ordreLecture.length; i++) {
    const chemin = resoudreChemin(cheminOpf, ordreLecture[i])
    const fichier = zip.file(chemin)
    if (!fichier) continue
    const xhtml = await fichier.async('string')
    const doc = new DOMParser().parseFromString(xhtml, 'application/xhtml+xml')
    doc.body?.querySelectorAll('h1, h2, h3, h4, h5, h6, p, blockquote').forEach((el) => {
      // Un <blockquote> EPUB enveloppe presque toujours un ou plusieurs <p> enfants : on
      // capture le texte au niveau du blockquote pour ne pas le compter deux fois.
      if (/^p$/i.test(el.tagName) && el.closest('blockquote')) return

      const texte = el.textContent.replace(/\s+/g, ' ').trim()
      if (!texte) return
      if (/^h[1-6]$/i.test(el.tagName)) {
        // Le niveau se décide d'abord sur le CONTENU, la profondeur de balise ne servant de
        // repli que pour les sous-titres — beaucoup d'EPUB mettent chaque titre de chapitre en
        // <h1>, un par fichier XHTML, donc la profondeur seule ne dit pas Partie vs Chapitre.
        const profondeur = Number(el.tagName.slice(1))
        paragraphes.push({ type: 'texte', texte, titre: true, niveau: niveauTitre(texte, profondeur) })
      } else if (/^blockquote$/i.test(el.tagName)) {
        paragraphes.push({ type: 'texte', texte, titre: false, niveau: null, citation: true })
      } else if (ressembleACitationAutonome(texte)) {
        // Repli pour une citation en <p> simple, sans balise <blockquote> dédiée.
        paragraphes.push({ type: 'texte', texte, titre: false, niveau: null, citation: true })
      } else {
        paragraphes.push({ type: 'texte', texte, titre: false, niveau: null })
      }
    })
    onProgression?.(Math.round(((i + 1) / ordreLecture.length) * 100))
  }

  const tableMatieres = paragraphes
    .map((p, i) => ({ ...p, i }))
    .filter((p) => p.titre)
    .map((p) => ({ texte: p.texte, niveau: p.niveau, index: p.i }))

  return { sections: decouperEnSections(paragraphes), tableMatieres, paragraphes }
}
