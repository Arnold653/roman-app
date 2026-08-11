'use client'

import { useEffect, useState } from 'react'

export default function AdminLivresPage() {
  const [livres, setLivres] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    titre: '', slug: '', auteur: '', description: '', genre: '', verifie_par: '', genere_par_ia: true,
  })
  const [fichier, setFichier] = useState(null)

  useEffect(() => { charger() }, [])

  async function charger() {
    const res = await fetch('/api/admin/livre')
    if (res.ok) setLivres((await res.json()).livres)
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function envoyer(e) {
    e.preventDefault()
    if (!fichier) { setMessage('Choisis un fichier PDF.'); return }
    setLoading(true)
    setMessage('')

    const data = new FormData()
    Object.entries(form).forEach(([k, v]) => data.append(k, v))
    data.append('fichier', fichier)

    const res = await fetch('/api/admin/livre', { method: 'POST', body: data })
    const resultat = await res.json()
    setLoading(false)

    if (!res.ok) {
      setMessage(`Erreur : ${resultat.error}`)
    } else {
      setMessage(`Publié ✓ — /livres/${resultat.slug}`)
      setForm({ titre: '', slug: '', auteur: '', description: '', genre: '', verifie_par: '', genere_par_ia: true })
      setFichier(null)
      charger()
    }
  }

  async function supprimer(livre) {
    if (!confirm(`Supprimer "${livre.titre}" ?`)) return
    const res = await fetch(`/api/admin/livre?id=${livre.id}`, { method: 'DELETE' })
    if (res.ok) { setMessage('Supprimé.'); charger() }
  }

  const champ = (label, field, type = 'text') => (
    <div>
      <label className="text-xs font-mono uppercase tracking-wide text-papier/40 block mb-2">{label}</label>
      {type === 'textarea' ? (
        <textarea value={form[field]} onChange={(e) => update(field, e.target.value)} rows={4}
          className="w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier text-sm leading-relaxed focus:outline-none focus:border-or transition-colors" />
      ) : (
        <input type={type} value={form[field]} onChange={(e) => update(field, e.target.value)}
          className="w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier text-sm focus:outline-none focus:border-or transition-colors" />
      )}
    </div>
  )

  return (
    <div className="px-6 pt-16 pb-24 max-w-xl mx-auto lever">
      <p className="text-or text-xs font-mono uppercase tracking-[0.2em] mb-3">Encre — Admin</p>
      <h1 className="font-display text-4xl text-papier mb-2">Publier un livre</h1>
      <p className="text-papier/45 text-sm mb-10 leading-relaxed">
        Un ouvrage complet livré en un seul fichier PDF — distinct des romans publiés chapitre par chapitre.
        <br /><a href="/admin" className="text-or hover:brightness-125">← Retour à l'admin des romans</a>
      </p>

      <form onSubmit={envoyer} className="space-y-6">
        {champ('Titre du livre', 'titre')}
        {champ('Slug (identifiant dans l\'URL)', 'slug')}
        {champ('Auteur (optionnel)', 'auteur')}
        {champ('Description / résumé', 'description', 'textarea')}
        {champ('Genre', 'genre')}

        <div>
          <label className="text-xs font-mono uppercase tracking-wide text-papier/40 block mb-2">Fichier PDF</label>
          <input type="file" accept="application/pdf" onChange={(e) => setFichier(e.target.files?.[0] || null)}
            className="w-full text-papier text-sm" />
        </div>

        <div className="border-t border-ligne pt-5">
          <p className="text-or text-xs font-mono uppercase tracking-widest mb-4">Transparence</p>
          <label className="flex items-center gap-2 text-sm text-papier/70 mb-4">
            <input type="checkbox" checked={form.genere_par_ia} onChange={(e) => update('genere_par_ia', e.target.checked)} />
            Contenu généré avec l'aide de l'IA
          </label>
          {champ('Vérifié par (nom, optionnel)', 'verifie_par')}
        </div>

        <button type="submit" disabled={loading} className="w-full bg-or text-encre font-medium rounded-lg px-3 py-3.5 hover:brightness-110 transition-all disabled:opacity-50">
          {loading ? 'Envoi en cours...' : 'Publier ce livre'}
        </button>
      </form>

      {message && <p className="text-sm text-papier/60 mt-4 font-mono">{message}</p>}

      <div className="filet-or my-14" />

      <p className="text-or text-xs font-mono uppercase tracking-widest mb-6">Livres publiés</p>
      <div className="space-y-2">
        {livres?.map((l) => (
          <div key={l.id} className="flex items-center justify-between bg-encreClair rounded-md px-4 py-3">
            <span className="text-sm text-papier/70">{l.titre}</span>
            <button onClick={() => supprimer(l)} className="text-xs font-mono uppercase text-papier/40 hover:text-grenat transition-colors">Suppr.</button>
          </div>
        ))}
        {livres?.length === 0 && <p className="text-papier/30 text-xs font-mono">Aucun livre publié.</p>}
      </div>
    </div>
  )
}
