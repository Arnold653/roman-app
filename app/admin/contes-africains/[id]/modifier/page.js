'use client'

import { useEffect, useState } from 'react'
import { decouperEnSections } from '@/lib/extractionCommune'

// Recalcule sections + table des matières à partir de tous les blocs (toutes sections
// confondues), pour que debut/fin/pilLabel restent cohérents après une édition qui change
// le nombre de paragraphes d'une section.
function reconstruire(sections) {
  const tousLesBlocs = sections.flatMap((s) => s.blocs)
  const tableMatieres = tousLesBlocs
    .map((p, i) => ({ ...p, i }))
    .filter((p) => p.titre)
    .map((p) => ({ texte: p.texte, niveau: p.niveau, index: p.i }))
  return { sections: decouperEnSections(tousLesBlocs), tableMatieres }
}

export default function ModifierConteAfricainPage({ params }) {
  const [conte, setConte] = useState(null)
  const [sectionIndex, setSectionIndex] = useState(0)
  const [blocs, setBlocs] = useState([])
  const [message, setMessage] = useState('')
  const [sauvegarde, setSauvegarde] = useState(false)

  useEffect(() => { charger() }, [])

  async function charger() {
    const res = await fetch(`/api/admin/conte-africain?id=${params.id}`)
    if (!res.ok) { setMessage('Conte introuvable ou accès refusé.'); return }
    const { conte } = await res.json()
    setConte(conte)
    setBlocs(conte.contenu_extrait?.sections?.[0]?.blocs || [])
  }

  function changerSection(i) {
    enregistrerBlocsLocalement()
    setSectionIndex(i)
    setBlocs(conte.contenu_extrait.sections[i].blocs)
  }

  // Répercute les modifications en cours dans l'objet conte en mémoire (sans sauvegarder en
  // base), pour ne pas perdre le travail en cours quand on change de section.
  function enregistrerBlocsLocalement() {
    setConte((l) => {
      const sections = l.contenu_extrait.sections.map((s, i) => (i === sectionIndex ? { ...s, blocs } : s))
      return { ...l, contenu_extrait: { ...l.contenu_extrait, sections } }
    })
  }

  function modifierBloc(i, champ, valeur) {
    setBlocs((bs) => bs.map((b, idx) => (idx === i ? { ...b, [champ]: valeur } : b)))
  }

  function supprimerBloc(i) {
    setBlocs((bs) => bs.filter((_, idx) => idx !== i))
  }

  function ajouterParagraphe() {
    setBlocs((bs) => [...bs, { type: 'texte', texte: '', titre: false, niveau: null }])
  }

  function deplacerBloc(i, direction) {
    setBlocs((bs) => {
      const j = i + direction
      if (j < 0 || j >= bs.length) return bs
      const copie = [...bs]
      ;[copie[i], copie[j]] = [copie[j], copie[i]]
      return copie
    })
  }

  async function sauvegarder() {
    setSauvegarde(true)
    setMessage('')
    const sections = conte.contenu_extrait.sections.map((s, i) => (i === sectionIndex ? { ...s, blocs } : s))
    const contenuFinal = reconstruire(sections)

    const res = await fetch('/api/admin/conte-africain', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'editer_contenu', id: conte.id, contenu: contenuFinal }),
    })
    setSauvegarde(false)
    if (res.ok) {
      setMessage('Enregistré ✓')
      setConte((l) => ({ ...l, contenu_extrait: contenuFinal }))
      setSectionIndex(0)
      setBlocs(contenuFinal.sections[0]?.blocs || [])
    } else {
      setMessage('Erreur lors de la sauvegarde.')
    }
  }

  if (message && !conte) return <div className="px-6 py-24 text-center text-papier/50 font-mono text-sm">{message}</div>
  if (!conte) return <div className="px-6 py-24 text-center text-papier/40 font-mono text-sm">Chargement...</div>
  if (!conte.contenu_extrait) {
    return (
      <div className="px-6 py-24 text-center text-papier/50 font-mono text-sm">
        Ce conte n'a pas encore été extrait — rien à modifier pour l'instant.
        <br /><a href="/admin/contes-africains" className="text-or">← Retour</a>
      </div>
    )
  }

  const sections = conte.contenu_extrait.sections

  return (
    <div className="px-6 pt-16 pb-24 max-w-2xl mx-auto lever">
      <p className="text-or text-xs font-mono uppercase tracking-[0.2em] mb-3">Encre — Admin</p>
      <h1 className="font-display text-3xl text-papier mb-2">Modifier « {conte.titre} »</h1>
      <p className="text-papier/40 text-sm mb-8">
        <a href="/admin/contes-africains" className="text-or hover:brightness-125">← Retour aux contes africains</a>
      </p>

      <div className="flex flex-wrap gap-2 mb-8">
        {sections.map((s, i) => (
          <button
            key={i}
            onClick={() => changerSection(i)}
            className={`font-mono text-xs rounded-full px-3 py-1 border transition-colors ${
              i === sectionIndex ? 'border-or text-or' : 'border-papier/15 text-papier/35 hover:border-papier/35'
            }`}
          >
            {s.pilLabel}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {blocs.map((b, i) => {
          const boutonsDeplacement = (
            <div className="flex flex-col gap-0.5 shrink-0">
              <button onClick={() => deplacerBloc(i, -1)} disabled={i === 0} title="Monter"
                className="text-papier/40 hover:text-or disabled:opacity-20 disabled:hover:text-papier/40 text-xs leading-none px-1">▲</button>
              <button onClick={() => deplacerBloc(i, 1)} disabled={i === blocs.length - 1} title="Descendre"
                className="text-papier/40 hover:text-or disabled:opacity-20 disabled:hover:text-papier/40 text-xs leading-none px-1">▼</button>
            </div>
          )
          if (b.type === 'image') {
            return (
              <div key={i} className="border border-ligne rounded-lg p-3 flex items-center gap-3">
                {boutonsDeplacement}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.url} alt="" className="w-16 h-16 object-cover rounded" />
                <span className="text-papier/40 text-xs font-mono flex-1">Image (non modifiable ici)</span>
                <button onClick={() => supprimerBloc(i)} className="text-papier/30 hover:text-grenat text-xs font-mono">Suppr.</button>
              </div>
            )
          }
          if (b.type === 'tableau') {
            return (
              <div key={i} className="border border-ligne rounded-lg p-3 flex gap-3">
                {boutonsDeplacement}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-papier/40 text-xs font-mono">Tableau ({b.lignes.length} lignes, non modifiable ici)</span>
                    <button onClick={() => supprimerBloc(i)} className="text-papier/30 hover:text-grenat text-xs font-mono">Suppr.</button>
                  </div>
                  <div className="text-papier/50 text-xs font-mono truncate">{b.lignes[0]?.join(' | ')}</div>
                </div>
              </div>
            )
          }
          return (
            <div key={i} className="border border-ligne rounded-lg p-3 flex gap-3">
              {boutonsDeplacement}
              <div className="flex-1 min-w-0">
                <textarea
                  value={b.texte}
                  onChange={(e) => modifierBloc(i, 'texte', e.target.value)}
                  rows={b.titre ? 1 : 4}
                  className="w-full bg-encreClair border border-ligne rounded-md px-3 py-2 text-papier text-sm leading-relaxed focus:outline-none focus:border-or transition-colors mb-2"
                />
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-papier/50">
                    <input type="checkbox" checked={b.titre} onChange={(e) => modifierBloc(i, 'titre', e.target.checked)} />
                    Titre
                  </label>
                  {b.titre && (
                    <select
                      value={b.niveau || 3}
                      onChange={(e) => modifierBloc(i, 'niveau', Number(e.target.value))}
                      className="bg-encreClair border border-ligne rounded px-2 py-1 text-xs text-papier/70"
                    >
                      <option value={1}>Niveau 1 — Partie</option>
                      <option value={2}>Niveau 2 — Chapitre</option>
                      <option value={3}>Niveau 3 — Sous-titre</option>
                      <option value={4}>Niveau 4 — Sous-titre</option>
                      <option value={5}>Niveau 5 — Sous-titre</option>
                      <option value={6}>Niveau 6 — Sous-titre</option>
                    </select>
                  )}
                  <button onClick={() => supprimerBloc(i)} className="text-papier/30 hover:text-grenat text-xs font-mono ml-auto">Suppr.</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <button onClick={ajouterParagraphe} className="text-or text-sm font-mono mt-4 hover:brightness-125">+ Ajouter un paragraphe</button>

      <div className="filet-or my-8" />

      <button
        onClick={sauvegarder} disabled={sauvegarde}
        className="w-full bg-or text-encre font-medium rounded-lg px-3 py-3.5 hover:brightness-110 transition-all disabled:opacity-50"
      >
        {sauvegarde ? 'Enregistrement...' : 'Enregistrer les modifications'}
      </button>
      {message && <p className="text-papier/50 text-sm font-mono mt-3">{message}</p>}
    </div>
  )
}
