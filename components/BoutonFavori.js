'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const COLONNE_PAR_TYPE = {
  roman: 'roman_id',
  livre: 'livre_id',
  'conte-africain': 'conte_africain_id',
  'conte-enfant': 'conte_enfant_id',
}

// Bouton favori réutilisable sur les 4 types de contenu. Écrit directement dans `favoris` via le
// client navigateur : la table est protégée par RLS (chaque lecteur ne peut agir que sur ses
// propres lignes), donc pas besoin d'une route API dédiée pour un simple bascule.
export default function BoutonFavori({ type, id }) {
  const [enFavori, setEnFavori] = useState(false)
  const [userId, setUserId] = useState(null)
  const [pret, setPret] = useState(false)
  const supabase = createClient()
  const colonne = COLONNE_PAR_TYPE[type]

  useEffect(() => {
    async function charger() {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)
      if (!user) { setPret(true); return }

      const { data } = await supabase
        .from('favoris')
        .select('id')
        .eq('user_id', user.id)
        .eq(colonne, id)
        .maybeSingle()
      setEnFavori(!!data)
      setPret(true)
    }
    charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id])

  async function basculer() {
    if (!userId) { window.location.href = '/login'; return }

    if (enFavori) {
      setEnFavori(false)
      await supabase.from('favoris').delete().eq('user_id', userId).eq(colonne, id)
    } else {
      setEnFavori(true)
      await supabase.from('favoris').insert({ user_id: userId, [colonne]: id })
    }
  }

  if (!pret) return null

  return (
    <button
      onClick={basculer}
      className={`inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide transition-colors ${
        enFavori ? 'text-or' : 'text-papier/40 hover:text-or'
      }`}
      title={enFavori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={enFavori ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
        <path d="M5 3h14a1 1 0 0 1 1 1v17l-8-5-8 5V4a1 1 0 0 1 1-1z" strokeLinejoin="round" />
      </svg>
      {enFavori ? 'Dans tes favoris' : 'Favori'}
    </button>
  )
}
