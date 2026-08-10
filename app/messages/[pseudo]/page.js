'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ConversationPage({ params }) {
  const [moi, setMoi] = useState(null)
  const [autre, setAutre] = useState(null)
  const [conversationId, setConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [texte, setTexte] = useState('')
  const [pret, setPret] = useState(false)
  const finRef = useRef(null)
  const supabase = createClient()

  async function obtenirOuCreerConversation(moiId, autreId) {
    const { data: existante } = await supabase
      .from('dm_conversations')
      .select('id')
      .or(`and(user_a.eq.${moiId},user_b.eq.${autreId}),and(user_a.eq.${autreId},user_b.eq.${moiId})`)
      .maybeSingle()

    if (existante) return existante.id

    const [a, b] = [moiId, autreId].sort()
    const { data: nouvelle } = await supabase
      .from('dm_conversations')
      .insert({ user_a: a, user_b: b })
      .select('id')
      .single()

    return nouvelle?.id
  }

  async function charger() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/login'
      return
    }
    setMoi(user)

    const { data: profilAutre } = await supabase
      .from('profiles')
      .select('id, pseudo, avatar_url')
      .eq('pseudo', params.pseudo)
      .single()

    if (!profilAutre) {
      setPret(true)
      return
    }
    setAutre(profilAutre)

    const convId = await obtenirOuCreerConversation(user.id, profilAutre.id)
    setConversationId(convId)

    if (convId) {
      const { data: msgs } = await supabase
        .from('dm_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
      setMessages(msgs ?? [])

      await supabase.from('dm_messages').update({ lu: true }).eq('conversation_id', convId).neq('sender_id', user.id)
    }
    setPret(true)
  }

  useEffect(() => {
    charger()
    const intervalle = setInterval(charger, 5000)
    return () => clearInterval(intervalle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.pseudo])

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function envoyer(e) {
    e.preventDefault()
    if (!texte.trim() || !conversationId) return

    const contenu = texte.trim()
    setTexte('')
    setMessages((m) => [...m, { id: 'temp-' + Date.now(), sender_id: moi.id, contenu, created_at: new Date().toISOString() }])

    await supabase.from('dm_messages').insert({ conversation_id: conversationId, sender_id: moi.id, contenu })
    charger()
  }

  if (pret && !autre) {
    return <div className="px-6 py-24 text-center text-papier/50 font-mono text-sm">Lecteur introuvable.</div>
  }

  return (
    <div className="flex flex-col h-[calc(100vh-73px)] max-w-2xl mx-auto">
      <a href="/messages" className="flex items-center gap-3 px-6 py-4 border-b border-ligne shrink-0">
        <span className="text-papier/50">←</span>
        {autre?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={autre.avatar_url} alt={autre.pseudo} className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-or to-[#0a1a2e] flex items-center justify-center">
            <span className="font-display text-sm text-papier">{autre?.pseudo?.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <span className="font-display text-lg text-papier">{autre?.pseudo}</span>
      </a>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender_id === moi?.id ? 'justify-end' : 'justify-start'}`}>
            <p
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.sender_id === moi?.id ? 'bg-or text-encre rounded-br-sm' : 'bg-encreClair text-papier rounded-bl-sm'
              }`}
            >
              {m.contenu}
            </p>
          </div>
        ))}
        {pret && messages.length === 0 && (
          <p className="text-papier/30 text-sm font-mono text-center pt-10">Dis bonjour 👋</p>
        )}
        <div ref={finRef} />
      </div>

      <form onSubmit={envoyer} className="flex gap-2 px-6 py-4 border-t border-ligne shrink-0">
        <input
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder="Écrire un message..."
          className="flex-1 bg-encreClair border border-ligne rounded-full px-4 py-2.5 text-papier text-sm focus:outline-none focus:border-or transition-colors"
        />
        <button
          type="submit"
          className="bg-or text-encre rounded-full w-10 h-10 flex items-center justify-center shrink-0 disabled:opacity-40"
          disabled={!texte.trim()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 20l18-8L3 4v6l12 2-12 2z" /></svg>
        </button>
      </form>
    </div>
  )
}
