'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function Avatar({ pseudo, avatar_url }) {
  if (avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatar_url} alt={pseudo} className="w-11 h-11 rounded-full object-cover shrink-0" />
  }
  return (
    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-or to-[#0a1a2e] flex items-center justify-center shrink-0">
      <span className="font-display text-base text-papier">{(pseudo || '?').charAt(0).toUpperCase()}</span>
    </div>
  )
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState(null)
  const supabase = createClient()

  useEffect(() => {
    async function charger() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }

      const { data: convs } = await supabase
        .from('dm_conversations')
        .select('id, user_a, user_b, created_at')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)

      const enrichies = await Promise.all(
        (convs ?? []).map(async (c) => {
          const autreId = c.user_a === user.id ? c.user_b : c.user_a
          const [{ data: profil }, { data: dernierMsg }] = await Promise.all([
            supabase.from('profiles').select('pseudo, avatar_url').eq('id', autreId).single(),
            supabase
              .from('dm_messages')
              .select('contenu, created_at, sender_id, lu')
              .eq('conversation_id', c.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
          ])
          return { ...c, profil, dernierMsg, nonLu: dernierMsg && !dernierMsg.lu && dernierMsg.sender_id !== user.id }
        })
      )

      enrichies.sort((a, b) => new Date(b.dernierMsg?.created_at || b.created_at) - new Date(a.dernierMsg?.created_at || a.created_at))
      setConversations(enrichies)
    }
    charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="px-6 pt-16 pb-24 max-w-2xl mx-auto lever">
      <p className="text-or text-xs font-mono uppercase tracking-[0.2em] mb-3">Encre</p>
      <h1 className="font-display text-4xl text-papier mb-10">Messages</h1>

      {conversations === null && <p className="text-papier/35 text-sm font-mono">Chargement...</p>}

      <ul className="divide-y divide-ligne">
        {conversations?.map((c) => (
          <li key={c.id}>
            <a href={`/messages/${c.profil?.pseudo}`} className="flex items-center gap-4 py-4">
              <Avatar pseudo={c.profil?.pseudo} avatar_url={c.profil?.avatar_url} />
              <div className="min-w-0 flex-1">
                <p className={`font-display text-lg ${c.nonLu ? 'text-papier' : 'text-papier/70'}`}>{c.profil?.pseudo}</p>
                <p className={`text-sm truncate ${c.nonLu ? 'text-papier/80 font-medium' : 'text-papier/40'}`}>
                  {c.dernierMsg?.contenu || 'Nouvelle conversation'}
                </p>
              </div>
              {c.nonLu && <span className="w-2.5 h-2.5 rounded-full bg-or shrink-0" />}
            </a>
          </li>
        ))}
        {conversations?.length === 0 && (
          <p className="text-papier/30 text-sm font-mono py-6">
            Pas encore de message. Va sur un{' '}
            <a href="/lecteurs" className="text-or hover:brightness-125">profil</a> pour en démarrer un.
          </p>
        )}
      </ul>
    </div>
  )
}
