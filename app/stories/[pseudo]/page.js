'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function StoriesPage({ params }) {
  const [stories, setStories] = useState(null)
  const [index, setIndex] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    async function charger() {
      const { data: profil } = await supabase.from('profiles').select('id, pseudo, avatar_url').eq('pseudo', params.pseudo).single()
      if (!profil) {
        setStories([])
        return
      }
      const { data } = await supabase
        .from('stories')
        .select('*')
        .eq('user_id', profil.id)
        .order('created_at', { ascending: true })
      setStories((data ?? []).map((s) => ({ ...s, profil })))
    }
    charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.pseudo])

  useEffect(() => {
    if (!stories || stories.length === 0) return
    const t = setTimeout(() => {
      if (index < stories.length - 1) setIndex((i) => i + 1)
      else window.location.href = '/'
    }, 5000)
    return () => clearTimeout(t)
  }, [index, stories])

  if (stories === null) return <div className="min-h-screen bg-black" />

  if (stories.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-papier/50 font-mono text-sm">
        Aucune story active.
      </div>
    )
  }

  const courante = stories[index]

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#0d5fae] to-[#050b16] flex flex-col z-50">
      <div className="flex gap-1.5 px-4 pt-4">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-[3px] bg-papier/25 rounded-full overflow-hidden">
            <div className={`h-full bg-papier ${i < index ? 'w-full' : i === index ? 'w-full animate-[grandir_5s_linear]' : 'w-0'}`} />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 px-4 pt-4">
        {courante.profil.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={courante.profil.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-or/80 flex items-center justify-center">
            <span className="font-display text-sm text-encre">{courante.profil.pseudo?.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <span className="text-papier font-mono text-sm">{courante.profil.pseudo}</span>
        <span className="text-papier/40 font-mono text-xs">
          {new Date(courante.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <a href="/" className="ml-auto text-papier/60 text-xl px-2">✕</a>
      </div>

      <div className="flex-1 flex items-center justify-center px-10 relative">
        <button
          onClick={() => index > 0 && setIndex(index - 1)}
          className="absolute left-0 top-0 bottom-0 w-1/3"
          aria-label="Précédent"
        />
        <button
          onClick={() => (index < stories.length - 1 ? setIndex(index + 1) : (window.location.href = '/'))}
          className="absolute right-0 top-0 bottom-0 w-1/3"
          aria-label="Suivant"
        />
        <p className="font-display text-2xl text-papier text-center leading-snug">{courante.contenu}</p>
      </div>

      <style>{`@keyframes grandir { from { width: 0% } to { width: 100% } }`}</style>
    </div>
  )
}
