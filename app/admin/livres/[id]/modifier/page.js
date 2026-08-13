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

export default function ModifierLivrePage({ params }) {
  const [livre, setLivre] = useState(null)
  const [sectionIndex, setSectionIndex] = useState(0)
  const [blocs, setBlocs] = useState([])
  const [message, setMessage] = useState('')
  const [sauvegarde, setSauvegarde] = useState(false)

  useEffect(() => { charger() }, [])

  async function charger() {
    const res = await fetch(`/api/admin/livre?id=${params.id}`)
    if (!res.ok) { setMessage('Livre introuvable ou accès refusé.'); return }
    const { livre } = await res.json()
    setLivre(livre)
    setBlocs(livre.contenu_extrait?.sections?.[0]?.blocs || [])
  }

  function changerSection(i) {
    enregistrerBlocsLocalement()
    setSectionIndex(i)
    setBlocs(livre.contenu_extrait.sections[i].blocs)
  }

  // Répercute les modifications en cours dans l'objet livre en mémoire (sans sauvegarder en
  // base), pour ne pas perdre le travail en cours quand on change de section.
  function enregistrerBlocsLocalement() {
    setLivre((l) => {
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

  async function sauvegarder() {
    setSauvegarde(true)
    setMessage('')
    const sections = livre.contenu_extrait.sections.map((s, i) => (i === sectionIndex ? { ...s, blocs } : s))
    const contenuFinal = reconstruire(sections)

    const res = await fetch('/api/admin/livre', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'editer_contenu', id: livre.id, contenu: contenuFinal }),
    })
    setSauvegarde(false)
    if (res.ok) {
      setMessage('Enregistré ✓')
      setLivre((l) => ({ ...l, contenu_extrait: contenuFinal }))
      setSectionIndex(0)
      setBlocs(contenuFinal.sections[0]?.blocs || [])
    } else {
      setMessage('Erreur lors de la sauvegarde.')
    }
  }

  if (message && !livre) return <div className="px-6 py-24 text-center text-papier/50 font-mono text-sm">{message}</div>
  if (!livre) return <div className="px-6 py-24 text-center text-papier/40 font-mono text-sm">Chargement...</div>
  if (!livre.contenu_extrait) {
    return (
      <div className="px-6 py-24 text-center text-papier/50 font-mono text-sm">
        Ce livre n'a pas encore été extrait — rien à modifier pour l'instant.
        <br /><a href="/admin/livres" className="text-or">← Retour</a>
      </div>
    )
  }

  const sections = livre.contenu_extrait.sections

  return (
    <div className="px-6 pt-16 pb-24 max-w-2xl mx-auto lever">
      <p className="text-or text-xs font-mono uppercase tracking-[0.2em] mb-3">Encre — Admin</p>
      <h1 className="font-display text-3xl text-papier mb-2">Modifier « {livre.titre} »</h1>
      <p className="text-papier/40 text-sm mb-8">
        <a href="/admin/livres" className="text-or hover:brightness-125">← Retour aux livres</a>
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
          if (b.type === 'image') {
            return (
              <div key={i} className="border border-ligne rounded-lg p-3 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.url} alt="" className="w-16 h-16 object-cover rounded" />
                <span className="text-papier/40 text-xs font-mono flex-1">Image (non modifiable ici)</span>
                <button onClick={() => supprimerBloc(i)} className="text-papier/30 hover:text-grenat text-xs font-mono">Suppr.</button>
              </div>
            )
          }
          if (b.type === 'tableau') {
            return (
              <div key={i} className="border border-ligne rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-papier/40 text-xs font-mono">Tableau ({b.lignes.length} lignes, non modifiable ici)</span>
                  <button onClick={() => supprimerBloc(i)} className="text-papier/30 hover:text-grenat text-xs font-mono">Suppr.</button>
                </div>
                <div className="text-papier/50 text-xs font-mono truncate">{b.lignes[0]?.join(' | ')}</div>
              </div>
            )
          }
          return (
            <div key={i} className="border border-ligne rounded-lg p-3">
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
                <button onClick={() => supprimerBloc(i)} className="text-papier/30 hover:text-grenat text-xs font-mono ml-auto">Supprimer</button>
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
