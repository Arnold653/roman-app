'use client'

import { useEffect, useRef, useState } from 'react'
import { parserMarkdownRoman } from '@/lib/parseMd'

const FORM_VIDE = {
  titre: '', slug: '', resume: '', genre: '', niveau_theme: 1,
  numero: 1, chapitre_titre: '', contenu: '', citation_fin: '', publie_le: '',
}

export default function AdminPage() {
  const [form, setForm] = useState(FORM_VIDE)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [romans, setRomans] = useState(null)
  const [edition, setEdition] = useState(null) // { type: 'roman' | 'chapitre', id }
  const [modeChapitreSeul, setModeChapitreSeul] = useState(false) // ajout rapide à un roman existant
  const [important, setImportant] = useState(null) // aperçu d'un import .md en attente de confirmation
  const inputFichierRef = useRef(null)

  useEffect(() => {
    chargerRomans()
  }, [])

  async function chargerRomans() {
    const res = await fetch('/api/admin/roman')
    if (res.ok) {
      const data = await res.json()
      setRomans(data.romans)
    }
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function reinitialiser() {
    setForm(FORM_VIDE)
    setEdition(null)
    setModeChapitreSeul(false)
    setMessage('')
  }

  function editerRoman(roman) {
    setModeChapitreSeul(false)
    setEdition({ type: 'roman', id: roman.id })
    setForm({ ...FORM_VIDE, titre: roman.titre, slug: roman.slug, resume: roman.resume, genre: roman.genre })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function editerChapitre(roman, chapitre) {
    setModeChapitreSeul(false)
    setEdition({ type: 'chapitre', id: chapitre.id })
    setForm({
      ...FORM_VIDE,
      titre: roman.titre, slug: roman.slug, resume: roman.resume, genre: roman.genre,
      numero: chapitre.numero,
      chapitre_titre: chapitre.titre || '',
      contenu: chapitre.contenu || '',
      citation_fin: chapitre.citation_fin || '',
      publie_le: chapitre.publie_le ? chapitre.publie_le.slice(0, 16) : '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Ajout rapide : pré-remplit le roman (masqué) et suggère le prochain numéro de chapitre
  function nouveauChapitrePour(roman) {
    setEdition(null)
    setModeChapitreSeul(true)
    const prochainNumero = (roman.chapitres.reduce((max, c) => Math.max(max, c.numero), 0) || 0) + 1
    setForm({
      ...FORM_VIDE,
      titre: roman.titre, slug: roman.slug, resume: roman.resume, genre: roman.genre,
      numero: prochainNumero,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function supprimerRoman(roman) {
    if (!confirm(`Supprimer "${roman.titre}" et TOUS ses chapitres ? C'est irréversible.`)) return
    const res = await fetch(`/api/admin/roman?type=roman&id=${roman.id}`, { method: 'DELETE' })
    if (res.ok) { setMessage(`"${roman.titre}" supprimé.`); chargerRomans() }
    else setMessage('Erreur lors de la suppression.')
  }

  async function supprimerChapitre(roman, chapitre) {
    if (!confirm(`Supprimer le chapitre ${chapitre.numero} de "${roman.titre}" ?`)) return
    const res = await fetch(`/api/admin/roman?type=chapitre&id=${chapitre.id}`, { method: 'DELETE' })
    if (res.ok) { setMessage(`Chapitre ${chapitre.numero} supprimé.`); chargerRomans() }
    else setMessage('Erreur lors de la suppression.')
  }

  async function envoyer(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const enEdition = !!edition
    const url = '/api/admin/roman'
    const method = enEdition ? 'PATCH' : 'POST'
    const body = enEdition ? { type: edition.type, id: edition.id, ...form } : form

    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setMessage(`Erreur : ${data.error}`)
    } else {
      setMessage(enEdition ? 'Modifications enregistrées ✓' : `Publié ✓ — visible sur /roman/${data.slug}`)
      reinitialiser()
      chargerRomans()
    }
  }

  // --- Import .md ---
  function choisirFichier(e) {
    const fichier = e.target.files?.[0]
    if (!fichier) return
    const lecteur = new FileReader()
    lecteur.onload = (evt) => {
      const resultat = parserMarkdownRoman(evt.target.result)
      setImportant(resultat)
    }
    lecteur.readAsText(fichier)
    e.target.value = ''
  }

  async function confirmerImport() {
    if (!important) return
    setLoading(true)
    setMessage('')

    const slug = form.slug || important.titre.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    let dernierSlug = slug
    for (const chap of important.chapitres) {
      const res = await fetch('/api/admin/roman', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titre: important.titre,
          slug,
          resume: important.resume,
          genre: important.genre,
          numero: chap.numero,
          chapitre_titre: chap.titre,
          contenu: chap.contenu,
          citation_fin: chap.citation_fin,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(`Erreur au chapitre ${chap.numero} : ${data.error}`)
        setLoading(false)
        return
      }
      dernierSlug = data.slug
    }

    setLoading(false)
    setMessage(`${important.chapitres.length} chapitre(s) importé(s) ✓ — /roman/${dernierSlug}`)
    setImportant(null)
    chargerRomans()
  }

  const champ = (label, field, type = 'text') => (
    <div>
      <label className="text-xs font-mono uppercase tracking-wide text-papier/40 block mb-2">{label}</label>
      {type === 'textarea' ? (
        <textarea
          value={form[field]}
          onChange={(e) => update(field, e.target.value)}
          rows={8}
          className="w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier text-sm leading-relaxed focus:outline-none focus:border-or transition-colors"
        />
      ) : (
        <input
          type={type}
          value={form[field]}
          onChange={(e) => update(field, type === 'number' ? Number(e.target.value) : e.target.value)}
          className="w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier text-sm focus:outline-none focus:border-or transition-colors"
        />
      )}
    </div>
  )

  return (
    <div className="px-6 pt-16 pb-24 max-w-xl mx-auto lever">
      <p className="text-or text-xs font-mono uppercase tracking-[0.2em] mb-3">Encre — Admin</p>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-4xl text-papier">
          {edition ? (edition.type === 'roman' ? 'Modifier le roman' : 'Modifier le chapitre') : modeChapitreSeul ? 'Nouveau chapitre' : 'Publier'}
        </h1>
        <button
          onClick={() => inputFichierRef.current?.click()}
          className="text-xs font-mono uppercase tracking-wide border border-ligne rounded-full px-3 py-1.5 text-papier/60 hover:border-or hover:text-or transition-colors shrink-0"
        >
          Importer .md
        </button>
        <input ref={inputFichierRef} type="file" accept=".md,text/markdown" onChange={choisirFichier} className="hidden" />
      </div>
      <p className="text-papier/45 text-sm mb-10 leading-relaxed">
        {modeChapitreSeul
          ? `Ajout rapide à « ${form.titre} » — les infos du roman restent inchangées.`
          : edition
          ? 'Modifie les champs ci-dessous puis enregistre.'
          : "Le roman est créé automatiquement s'il n'existe pas encore (basé sur le \"slug\"), sinon le chapitre s'y ajoute."}
      </p>

      <form onSubmit={envoyer} className="space-y-6">
        {!modeChapitreSeul && (
          <>
            <p className="text-or text-xs font-mono uppercase tracking-widest">Le roman</p>
            {champ('Titre du roman', 'titre')}
            {champ("Slug (identifiant dans l'URL, ex: le-dernier-refuge)", 'slug')}
            {champ('Résumé court', 'resume', 'textarea')}
            {champ('Genre (libre : thriller, romance, aventure...)', 'genre')}
          </>
        )}

        {edition?.type !== 'roman' && (
          <>
            <p className="text-or text-xs font-mono uppercase tracking-widest pt-4">Le chapitre</p>
            {champ('Numéro du chapitre', 'numero', 'number')}
            {champ('Titre du chapitre (optionnel)', 'chapitre_titre')}
            {champ('Texte du chapitre', 'contenu', 'textarea')}
            {champ('Citation/réflexion de fin (optionnel)', 'citation_fin')}
            <div>
              <label className="text-xs font-mono uppercase tracking-wide text-papier/40 block mb-2">
                Publication (laisser vide = immédiat)
              </label>
              <input
                type="datetime-local"
                value={form.publie_le}
                onChange={(e) => update('publie_le', e.target.value)}
                className="w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier text-sm focus:outline-none focus:border-or transition-colors"
              />
              <p className="text-papier/30 text-xs mt-2">Programme la sortie : le chapitre reste invisible et n'envoie de notification qu'à cette date.</p>
            </div>
          </>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-or text-encre font-medium rounded-lg px-3 py-3.5 hover:brightness-110 transition-all disabled:opacity-50"
          >
            {loading ? 'Enregistrement...' : edition ? 'Enregistrer les modifications' : modeChapitreSeul ? 'Publier ce chapitre' : 'Publier'}
          </button>
          {(edition || modeChapitreSeul) && (
            <button type="button" onClick={reinitialiser} className="px-5 rounded-lg border border-ligne text-papier/60 hover:text-papier transition-colors">
              Annuler
            </button>
          )}
        </div>
      </form>

      {message && <p className="text-sm text-papier/60 mt-4 font-mono">{message}</p>}

      {important && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-6" onClick={() => setImportant(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-encreClair border border-ligne rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <p className="text-or text-xs font-mono uppercase tracking-widest mb-3">Aperçu de l'import</p>
            <p className="font-display text-xl text-papier mb-1">{important.titre || '(sans titre — utilise le slug déjà saisi)'}</p>
            <p className="text-papier/40 text-xs font-mono mb-4">{important.genre}</p>
            <p className="text-papier/60 text-sm mb-4">{important.resume}</p>
            <p className="text-papier/50 text-xs font-mono mb-4">{important.chapitres.length} chapitre(s) détecté(s) :</p>
            <ul className="space-y-1 mb-6">
              {important.chapitres.map((c) => (
                <li key={c.numero} className="text-sm text-papier/70">Ch. {c.numero} {c.titre && `— ${c.titre}`}</li>
              ))}
            </ul>
            <div className="flex gap-3">
              <button onClick={confirmerImport} disabled={loading} className="flex-1 bg-or text-encre font-medium rounded-lg px-3 py-3 disabled:opacity-50">
                {loading ? "Import en cours..." : "Confirmer l'import"}
              </button>
              <button onClick={() => setImportant(null)} className="px-5 rounded-lg border border-ligne text-papier/60">Annuler</button>
            </div>
          </div>
        </div>
      )}

      <div className="filet-or my-14" />

      <p className="text-or text-xs font-mono uppercase tracking-widest mb-6">Romans publiés</p>

      {romans === null && <p className="text-papier/35 text-sm font-mono">Chargement...</p>}
      {romans?.length === 0 && <p className="text-papier/35 text-sm font-mono">Rien publié pour l'instant.</p>}

      <div className="space-y-8">
        {romans?.map((roman) => (
          <div key={roman.id} className="border border-ligne rounded-lg p-5">
            <div className="flex items-start justify-between gap-3 mb-1">
              <h3 className="font-display text-xl text-papier">{roman.titre}</h3>
              <div className="flex gap-3 shrink-0 font-mono text-xs uppercase tracking-wide">
                <button onClick={() => editerRoman(roman)} className="text-papier/50 hover:text-or transition-colors">Éditer</button>
                <button onClick={() => supprimerRoman(roman)} className="text-papier/50 hover:text-grenat transition-colors">Suppr.</button>
              </div>
            </div>
            <p className="text-papier/35 text-xs font-mono mb-4">/{roman.slug} — {roman.genre}</p>

            <button
              onClick={() => nouveauChapitrePour(roman)}
              className="w-full text-sm border border-dashed border-or/40 text-or rounded-md py-2.5 mb-4 hover:bg-or/5 transition-colors"
            >
              + Ajouter un chapitre
            </button>

            <div className="space-y-2">
              {roman.chapitres.map((chapitre) => {
                const programme = chapitre.publie_le && new Date(chapitre.publie_le) > new Date()
                return (
                  <div key={chapitre.id} className="flex items-center justify-between bg-encreClair rounded-md px-4 py-2.5">
                    <span className="text-sm text-papier/70">
                      Ch. {chapitre.numero}{chapitre.titre ? ` — ${chapitre.titre}` : ''}
                      {programme && (
                        <span className="ml-2 text-[0.65rem] font-mono text-or border border-or/30 rounded-full px-2 py-0.5">
                          Programmé
                        </span>
                      )}
                    </span>
                    <div className="flex gap-3 shrink-0 font-mono text-xs uppercase tracking-wide">
                      <button onClick={() => editerChapitre(roman, chapitre)} className="text-papier/40 hover:text-or transition-colors">Éditer</button>
                      <button onClick={() => supprimerChapitre(roman, chapitre)} className="text-papier/40 hover:text-grenat transition-colors">Suppr.</button>
                    </div>
                  </div>
                )
              })}
              {roman.chapitres.length === 0 && <p className="text-papier/30 text-xs font-mono">Aucun chapitre.</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
