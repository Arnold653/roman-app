'use client'

import { useState } from 'react'

// Petit contrôle réutilisable : miniature + bouton pour changer la couverture réelle
// d'un titre déjà créé (roman, livre, conte africain ou conte enfant).
// section : 'roman' | 'livre' | 'conte-africain' | 'conte-enfant'
// onUploaded(url) est appelé après succès pour que la page appelante mette à jour son état local.
export function CouvertureAdmin({ section, id, url, onUploaded }) {
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  async function changerFichier(e) {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    setErreur('')
    setEnCours(true)
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const lecteur = new FileReader()
        lecteur.onload = () => resolve(lecteur.result)
        lecteur.onerror = () => reject(new Error('Lecture du fichier impossible'))
        lecteur.readAsDataURL(fichier)
      })
      const res = await fetch('/api/admin/couverture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, id, dataUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Échec de l\'upload')
      onUploaded?.(data.url)
    } catch (err) {
      setErreur(err.message)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className="w-9 h-12 rounded overflow-hidden bg-encre border border-ligne shrink-0">
        {url ? (
          <img src={url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-papier/20 text-[0.6rem] font-mono">—</div>
        )}
      </div>
      <label className="text-[0.65rem] font-mono uppercase tracking-wide text-papier/40 hover:text-or cursor-pointer">
        {enCours ? 'Envoi…' : url ? 'Changer' : 'Ajouter'}
        <input type="file" accept="image/*" className="hidden" onChange={changerFichier} disabled={enCours} />
      </label>
      {erreur && <span className="text-[0.6rem] text-red-400">{erreur}</span>}
    </div>
  )
}
