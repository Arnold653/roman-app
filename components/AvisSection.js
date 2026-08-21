'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const COLONNE_PAR_TYPE = {
  roman: 'roman_id',
  livre: 'livre_id',
  'conte-africain': 'conte_africain_id',
  'conte-enfant': 'conte_enfant_id',
}

function Etoiles({ valeur, taille = 18, interactif, onChange }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!interactif}
          onClick={() => onChange?.(n)}
          className={interactif ? 'cursor-pointer' : 'cursor-default'}
        >
          <svg width={taille} height={taille} viewBox="0 0 24 24" fill={n <= valeur ? '#e0a94f' : 'none'} stroke="#e0a94f" strokeWidth="1.5">
            <path d="M12 2.5l2.9 6 6.6.8-4.8 4.6 1.2 6.5-5.9-3.2-5.9 3.2 1.2-6.5-4.8-4.6 6.6-.8z" strokeLinejoin="round" />
          </svg>
        </button>
      ))}
    </div>
  )
}

// Note + avis, réutilisable sur les 4 types de contenu. Affiche la moyenne + les derniers avis,
// et permet au lecteur connecté de laisser (ou modifier) le sien.
export default function AvisSection({ type, id }) {
  const [avis, setAvis] = useState([])
  const [userId, setUserId] = useState(null)
  const [maNote, setMaNote] = useState(0)
  const [monCommentaire, setMonCommentaire] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [pret, setPret] = useState(false)
  const supabase = createClient()
  const colonne = COLONNE_PAR_TYPE[type]

  async function charger() {
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)

    const { data } = await supabase
      .from('avis')
      .select('id, user_id, note, commentaire, created_at, profiles(pseudo)')
      .eq(colonne, id)
      .order('created_at', { ascending: false })
      .limit(20)
    setAvis(data ?? [])

    const mien = (data ?? []).find((a) => a.user_id === user?.id)
    if (mien) { setMaNote(mien.note); setMonCommentaire(mien.commentaire || '') }
    setPret(true)
  }

  useEffect(() => {
    charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id])

  async function envoyer() {
    if (!userId) { window.location.href = '/login'; return }
    if (maNote < 1) return
    setEnvoi(true)
    await supabase
      .from('avis')
      .upsert({ user_id: userId, [colonne]: id, note: maNote, commentaire: monCommentaire.trim() || null, updated_at: new Date().toISOString() }, { onConflict: `user_id,${colonne}` })
    setEnvoi(false)
    charger()
  }

  const moyenne = avis.length > 0 ? avis.reduce((s, a) => s + a.note, 0) / avis.length : 0

  if (!pret) return null

  return (
    <div className="border-t border-ligne pt-8 mt-8">
      <div className="flex items-center gap-3 mb-6">
        <Etoiles valeur={Math.round(moyenne)} />
        {avis.length > 0 && (
          <p className="text-papier/40 text-sm font-mono">
            {moyenne.toFixed(1)}/5 · {avis.length} avis
          </p>
        )}
      </div>

      {userId && (
        <div className="mb-8 bg-encreClair/50 border border-ligne rounded-lg p-4">
          <p className="text-xs font-mono uppercase tracking-wide text-papier/40 mb-2">Ton avis</p>
          <Etoiles valeur={maNote} interactif onChange={setMaNote} taille={22} />
          <textarea
            value={monCommentaire}
            onChange={(e) => setMonCommentaire(e.target.value)}
            placeholder="Un commentaire (optionnel)"
            rows={2}
            className="w-full bg-encre border border-ligne rounded-md p-3 text-sm text-papier/80 mt-3 resize-none focus:outline-none focus:border-or"
          />
          <button
            onClick={envoyer}
            disabled={maNote < 1 || envoi}
            className="text-xs font-mono border border-or/40 text-or rounded-full px-4 py-2 mt-3 disabled:opacity-40"
          >
            {envoi ? 'Envoi…' : 'Publier'}
          </button>
        </div>
      )}

      <ul className="space-y-5">
        {avis.filter((a) => a.commentaire).map((a) => (
          <li key={a.id}>
            <div className="flex items-center gap-2 mb-1">
              <Etoiles valeur={a.note} taille={13} />
              <p className="text-papier/50 text-xs font-mono">{a.profiles?.pseudo || 'Lecteur'}</p>
            </div>
            <p className="text-papier/70 text-sm leading-relaxed">{a.commentaire}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
