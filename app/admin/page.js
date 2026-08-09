'use client'

import { useState } from 'react'

export default function AdminPage() {
  const [form, setForm] = useState({
    titre: '', slug: '', resume: '', genre: '', niveau_theme: 1,
    numero: 1, chapitre_titre: '', contenu: '', citation_fin: '',
  })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function envoyer(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const res = await fetch('/api/admin/roman', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) setMessage(`Erreur : ${data.error}`)
    else setMessage(`Publié ✓ — visible sur /roman/${data.slug}`)
  }

  const champ = (label, field, type = 'text') => (
    <div>
      <label className="text-xs text-papier/50 block mb-1">{label}</label>
      {type === 'textarea' ? (
        <textarea
          value={form[field]}
          onChange={(e) => update(field, e.target.value)}
          rows={8}
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-papier text-sm focus:outline-none focus:border-braise"
        />
      ) : (
        <input
          type={type}
          value={form[field]}
          onChange={(e) => update(field, type === 'number' ? Number(e.target.value) : e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-papier text-sm focus:outline-none focus:border-braise"
        />
      )}
    </div>
  )

  return (
    <div className="px-6 py-10 max-w-xl mx-auto pb-24">
      <h1 className="font-display text-3xl text-papier mb-1">Publier</h1>
      <p className="text-papier/50 text-sm mb-8">
        Accessible seulement à ton compte admin. Le roman est créé automatiquement
        s'il n'existe pas encore (basé sur le "slug"), sinon le chapitre s'y ajoute.
      </p>

      <form onSubmit={envoyer} className="space-y-5">
        <p className="text-braise text-xs uppercase tracking-wide">Le roman</p>
        {champ('Titre du roman', 'titre')}
        {champ('Slug (identifiant dans l\'URL, ex: le-dernier-refuge)', 'slug')}
        {champ('Résumé court', 'resume', 'textarea')}
        {champ('Genre (libre : thriller, romance, aventure...)', 'genre')}

        <p className="text-braise text-xs uppercase tracking-wide pt-4">Le chapitre</p>
        {champ('Numéro du chapitre', 'numero', 'number')}
        {champ('Titre du chapitre (optionnel)', 'chapitre_titre')}
        {champ('Texte du chapitre', 'contenu', 'textarea')}
        {champ('Citation/réflexion de fin (optionnel)', 'citation_fin')}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-braise text-encre font-medium rounded px-3 py-3 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Publication...' : 'Publier ce chapitre'}
        </button>
      </form>

      {message && <p className="text-sm text-papier/70 mt-4">{message}</p>}
    </div>
  )
}
