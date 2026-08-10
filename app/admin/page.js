'use client'

import { useEffect, useState } from 'react'

const FORM_VIDE = {
  titre: '', slug: '', resume: '', genre: '', niveau_theme: 1,
  numero: 1, chapitre_titre: '', contenu: '', citation_fin: '',
}

export default function AdminPage() {
  const [form, setForm] = useState(FORM_VIDE)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [romans, setRomans] = useState(null)
  const [edition, setEdition] = useState(null) // { type: 'roman' | 'chapitre', id }

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
    setMessage('')
  }

  function editerRoman(roman) {
    setEdition({ type: 'roman', id: roman.id })
    setForm({
      ...FORM_VIDE,
      titre: roman.titre,
      slug: roman.slug,
      resume: roman.resume,
      genre: roman.genre,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function editerChapitre(roman, chapitre) {
    setEdition({ type: 'chapitre', id: chapitre.id })
    setForm({
      ...FORM_VIDE,
      titre: roman.titre,
      slug: roman.slug,
      resume: roman.resume,
      genre: roman.genre,
      numero: chapitre.numero,
      chapitre_titre: chapitre.titre || '',
      contenu: chapitre.contenu || '',
      citation_fin: chapitre.citation_fin || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function supprimerRoman(roman) {
    if (!confirm(`Supprimer "${roman.titre}" et TOUS ses chapitres ? C'est irréversible.`)) return
    const res = await fetch(`/api/admin/roman?type=roman&id=${roman.id}`, { method: 'DELETE' })
    if (res.ok) {
      setMessage(`"${roman.titre}" supprimé.`)
      chargerRomans()
    } else {
      setMessage('Erreur lors de la suppression.')
    }
  }

  async function supprimerChapitre(roman, chapitre) {
    if (!confirm(`Supprimer le chapitre ${chapitre.numero} de "${roman.titre}" ?`)) return
    const res = await fetch(`/api/admin/roman?type=chapitre&id=${chapitre.id}`, { method: 'DELETE' })
    if (res.ok) {
      setMessage(`Chapitre ${chapitre.numero} supprimé.`)
      chargerRomans()
    } else {
      setMessage('Erreur lors de la suppression.')
    }
  }

  async function envoyer(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const enEdition = !!edition
    const url = '/api/admin/roman'
    const method = enEdition ? 'PATCH' : 'POST'
    const body = enEdition
      ? { type: edition.type, id: edition.id, ...form }
      : form

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
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
      <h1 className="font-display text-4xl text-papier mb-2">
        {edition ? (edition.type === 'roman' ? 'Modifier le roman' : 'Modifier le chapitre') : 'Publier'}
      </h1>
      <p className="text-papier/45 text-sm mb-10 leading-relaxed">
        {edition
          ? "Modifie les champs ci-dessous puis enregistre."
          : "Le roman est créé automatiquement s'il n'existe pas encore (basé sur le \"slug\"), sinon le chapitre s'y ajoute."}
      </p>

      <form onSubmit={envoyer} className="space-y-6">
        <p className="text-or text-xs font-mono uppercase tracking-widest">Le roman</p>
        {champ('Titre du roman', 'titre')}
        {champ("Slug (identifiant dans l'URL, ex: le-dernier-refuge)", 'slug')}
        {champ('Résumé court', 'resume', 'textarea')}
        {champ('Genre (libre : thriller, romance, aventure...)', 'genre')}

        {edition?.type !== 'roman' && (
          <>
            <p className="text-or text-xs font-mono uppercase tracking-widest pt-4">Le chapitre</p>
            {champ('Numéro du chapitre', 'numero', 'number')}
            {champ('Titre du chapitre (optionnel)', 'chapitre_titre')}
            {champ('Texte du chapitre', 'contenu', 'textarea')}
            {champ('Citation/réflexion de fin (optionnel)', 'citation_fin')}
          </>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-or text-encre font-medium rounded-lg px-3 py-3.5 hover:brightness-110 transition-all disabled:opacity-50"
          >
            {loading ? 'Enregistrement...' : edition ? 'Enregistrer les modifications' : 'Publier ce chapitre'}
          </button>
          {edition && (
            <button
              type="button"
              onClick={reinitialiser}
              className="px-5 rounded-lg border border-ligne text-papier/60 hover:text-papier transition-colors"
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      {message && <p className="text-sm text-papier/60 mt-4 font-mono">{message}</p>}

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
                <button onClick={() => editerRoman(roman)} className="text-papier/50 hover:text-or transition-colors">
                  Éditer
                </button>
                <button onClick={() => supprimerRoman(roman)} className="text-papier/50 hover:text-grenat transition-colors">
                  Suppr.
                </button>
              </div>
            </div>
            <p className="text-papier/35 text-xs font-mono mb-4">/{roman.slug} — {roman.genre}</p>

            <div className="space-y-2">
              {roman.chapitres.map((chapitre) => (
                <div
                  key={chapitre.id}
                  className="flex items-center justify-between bg-encreClair rounded-md px-4 py-2.5"
                >
                  <span className="text-sm text-papier/70">
                    Ch. {chapitre.numero}{chapitre.titre ? ` — ${chapitre.titre}` : ''}
                  </span>
                  <div className="flex gap-3 shrink-0 font-mono text-xs uppercase tracking-wide">
                    <button onClick={() => editerChapitre(roman, chapitre)} className="text-papier/40 hover:text-or transition-colors">
                      Éditer
                    </button>
                    <button onClick={() => supprimerChapitre(roman, chapitre)} className="text-papier/40 hover:text-grenat transition-colors">
                      Suppr.
                    </button>
                  </div>
                </div>
              ))}
              {roman.chapitres.length === 0 && (
                <p className="text-papier/30 text-xs font-mono">Aucun chapitre.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
