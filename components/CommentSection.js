'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function CommentSection({ chapitreId }) {
  const [commentaires, setCommentaires] = useState([])
  const [texte, setTexte] = useState('')
  const supabase = createClient()

  async function charger() {
    const { data } = await supabase
      .from('commentaires')
      .select('id, contenu, created_at, profiles(pseudo)')
      .eq('chapitre_id', chapitreId)
      .order('created_at', { ascending: true })
    setCommentaires(data ?? [])
  }

  useEffect(() => {
    charger()
  }, [chapitreId])

  async function envoyer(e) {
    e.preventDefault()
    if (!texte.trim()) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/login'
      return
    }

    await supabase.from('commentaires').insert({
      chapitre_id: chapitreId,
      user_id: user.id,
      contenu: texte.trim(),
    })
    fetch('/api/notify/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapitre_id: chapitreId }),
    }).catch(() => {})
    setTexte('')
    charger()
  }

  return (
    <div className="mt-16 pt-10 border-t border-ligne">
      <h3 className="font-display text-2xl text-papier mb-6">Réactions des lecteurs</h3>

      <form onSubmit={envoyer} className="flex gap-2 mb-8">
        <input
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder="Que penses-tu de ce chapitre ?"
          className="flex-1 bg-encreClair border border-ligne rounded-full px-4 py-2.5 text-sm text-papier placeholder:text-papier/30 focus:outline-none focus:border-or transition-colors"
        />
        <button
          type="submit"
          className="bg-or text-encre text-sm font-medium rounded-full px-5 hover:brightness-110 transition-all"
        >
          Envoyer
        </button>
      </form>

      <ul className="space-y-5">
        {commentaires.map((c) => (
          <li key={c.id} className="text-sm border-l border-ligne pl-4">
            <a
              href={`/profil/${c.profiles?.pseudo ?? ''}`}
              className="text-or font-mono text-xs uppercase tracking-wide hover:brightness-125 transition-all"
            >
              {c.profiles?.pseudo ?? 'Lecteur'}
            </a>
            <p className="text-papier/70 mt-1 leading-relaxed">{c.contenu}</p>
          </li>
        ))}
        {commentaires.length === 0 && (
          <p className="text-papier/30 text-sm font-mono">Aucune réaction pour l'instant — lance la conversation.</p>
        )}
      </ul>
    </div>
  )
}
