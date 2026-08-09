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
    setTexte('')
    charger()
  }

  return (
    <div className="mt-14 border-t border-white/10 pt-8">
      <h3 className="font-display text-xl text-papier mb-4">Réactions des lecteurs</h3>

      <form onSubmit={envoyer} className="flex gap-2 mb-6">
        <input
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder="Que penses-tu de ce chapitre ?"
          className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-papier placeholder:text-papier/30 focus:outline-none focus:border-braise"
        />
        <button
          type="submit"
          className="bg-braise text-encre text-sm font-medium rounded px-4 hover:opacity-90 transition-opacity"
        >
          Envoyer
        </button>
      </form>

      <ul className="space-y-4">
        {commentaires.map((c) => (
          <li key={c.id} className="text-sm">
            <span className="text-braise font-medium">{c.profiles?.pseudo ?? 'Lecteur'}</span>
            <p className="text-papier/70">{c.contenu}</p>
          </li>
        ))}
        {commentaires.length === 0 && (
          <p className="text-papier/30 text-sm">Sois le premier à réagir.</p>
        )}
      </ul>
    </div>
  )
}
