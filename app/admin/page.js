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
      <h1 className="font-display text-4xl text-papier mb-2">Publier</h1>
      <p className="text-papier/45 text-sm mb-10 leading-relaxed">
        Le roman est créé automatiquement s'il n'existe pas encore (basé sur le "slug"),
        sinon le chapitre s'y ajoute.
      </p>

      <form onSubmit={envoyer} className="space-y-6">
        <p className="text-or text-xs font-mono uppercase tracking-widest">Le roman</p>
        {champ('Titre du roman', 'titre')}
        {champ("Slug (identifiant dans l'URL, ex: le-dernier-refuge)", 'slug')}
        {champ('Résumé court', 'resume', 'textarea')}
        {champ('Genre (libre : thriller, romance, aventure...)', 'genre')}

        <p className="text-or text-xs font-mono uppercase tracking-widest pt-4">Le chapitre</p>
        {champ('Numéro du chapitre', 'numero', 'number')}
        {champ('Titre du chapitre (optionnel)', 'chapitre_titre')}
        {champ('Texte du chapitre', 'contenu', 'textarea')}
        {champ('Citation/réflexion de fin (optionnel)', 'citation_fin')}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-or text-encre font-medium rounded-lg px-3 py-3.5 hover:brightness-110 transition-all disabled:opacity-50"
        >
          {loading ? 'Publication...' : 'Publier ce chapitre'}
        </button>
      </form>

      {message && <p className="text-sm text-papier/60 mt-4 font-mono">{message}</p>}
    </div>
  )
}
