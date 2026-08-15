'use client'

import { useEffect, useState } from 'react'
import { decouperEnSections } from '@/lib/extractionCommune'

// Recalcule sections + table des matières à partir de tous les blocs (toutes sections
// confondues), pour que debut/fin/pilLabel restent cohérents après une édition qui change
// le nombre de paragraphes d'une section. Identique à l'équivalent Livres.
function reconstruire(sections) {
  const tousLesBlocs = sections.flatMap((s) => s.blocs)
  const tableMatieres = tousLesBlocs
    .map((p, i) => ({ ...p, i }))
    .filter((p) => p.titre)
    .map((p) => ({ texte: p.texte, niveau: p.niveau, index: p.i }))
  return { sections: decouperEnSections(tousLesBlocs), tableMatieres }
}

export default function ModifierConteEnfantPage({ params }) {
  const [conte, setConte] = useState(null)
  const [sectionIndex, setSectionIndex] = useState(0)
  const [blocs, setBlocs] = useState([])
  const [message, setMessage] = useState('')
  const [sauvegarde, setSauvegarde] = useState(false)

  useEffect(() => { charger() }, [])

  async function charger() {
    const res = await fetch(`/api/admin/conte-enfant?id=${params.id}`)
    if (!res.ok) { setMessage('Histoire introuvable ou accès refusé.'); return }
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
  // base), pour ne pas perdre le travail en cours quand on change de page.
  function enregistrerBlocsLocalement() {
    setConte((c) => {
      const sections = c.contenu_extrait.sections.map((s, i) => (i === sectionIndex ? { ...s, blocs } : s))
      return { ...c, contenu_extrait: { ...c.contenu_extrait, sections } }
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
    const sections = conte.contenu_extrait.sections.map((s, i) => (i === sectionIndex ? { ...s, blocs } : s))
    const contenuFinal = reconstruire(sections)

    const res = await fetch('/api/admin/conte-enfant', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'editer_contenu', id: conte.id, contenu: contenuFinal }),
    })
    setSauvegarde(false)
    if (res.ok) {
      setMessage('Enregistré ✓')
      setConte((c) => ({ ...c, contenu_extrait: contenuFinal }))
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
        Cette histoire n'a pas encore été extraite — rien à modifier pour l'instant.
        <br /><a href="/admin/contes-enfants" className="text-[#ffd166]">← Retour</a>
      </div>
    )
  }

  const sections = conte.contenu_extrait.sections

  return (
    <div className="px-6 pt-16 pb-24 max-w-2xl mx-auto lever">
      <p className="text-[#ffd166] text-xs font-mono uppercase tracking-[0.2em] mb-3">Encre — Admin</p>
      <h1 className="font-display text-3xl text-papier mb-2">Modifier « {conte.titre} »</h1>
      <p className="text-papier/40 text-sm mb-8">
        <a href="/admin/contes-enfants" className="text-[#ffd166] hover:brightness-125">← Retour aux contes enfants</a>
      </p>

      <div className="flex flex-wrap gap-2 mb-8">
        {sections.map((s, i) => (
          <button
            key={i}
            onClick={() => changerSection(i)}
            className={`font-mono text-xs rounded-full px-3 py-1 border transition-colors ${
              i === sectionIndex ? 'border-[#ffd166] text-[#ffd166]' : 'border-papier/15 text-papier/35 hover:border-papier/35'
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
                className="w-full bg-encreClair border border-ligne rounded-md px-3 py-2 text-papier text-sm leading-relaxed focus:outline-none focus:border-[#ffd166] transition-colors mb-2"
              />
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs text-papier/50">
                  <input type="checkbox" checked={b.titre} onChange={(e) => modifierBloc(i, 'titre', e.target.checked)} />
                  Repère de page
                </label>
                {b.titre && (
                  <select
                    value={b.niveau || 3}
                    onChange={(e) => modifierBloc(i, 'niveau', Number(e.target.value))}
                    className="bg-encreClair border border-ligne rounded px-2 py-1 text-xs text-papier/70"
                  >
                    <option value={1}>Niveau 1 — Partie</option>
                    <option value={2}>Niveau 2 — Nouvelle page</option>
                    <option value={3}>Niveau 3 — Sous-titre</option>
                    <option value={4}>Niveau 4 — Sous-titre</option>
                    <option value={5}>Niveau 5 — Sous-titre</option>
                    <option value={6}>Niveau 6 — Sous-titre</option>
                  </select>
                )}
                <button onClick={() => supprimerBloc(i)} className="text-papier/30 hover:text-grenat text-xs font-mono ml-auto">Suppr.</button>
              </div>
            </div>
          )
        })}
      </div>

      <button onClick={ajouterParagraphe} className="text-[#ffd166] text-sm font-mono mt-4 hover:brightness-125">+ Ajouter un paragraphe</button>

      <div className="filet-or my-8" />

      <button
        onClick={sauvegarder} disabled={sauvegarde}
        className="w-full bg-[#ffd166] text-encre font-medium rounded-lg px-3 py-3.5 hover:brightness-110 transition-all disabled:opacity-50"
      >
        {sauvegarde ? 'Enregistrement...' : 'Enregistrer les modifications'}
      </button>
      {message && <p className="text-papier/50 text-sm font-mono mt-3">{message}</p>}
    </div>
  )
}
