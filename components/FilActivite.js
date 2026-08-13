'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function tempsRelatif(dateStr) {
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diffSec < 60) return "à l'instant"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `il y a ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH} h`
  const diffJ = Math.floor(diffH / 24)
  if (diffJ < 7) return `il y a ${diffJ} j`
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function initiale(pseudo) {
  return (pseudo || '?').trim().charAt(0).toUpperCase()
}

function CoeurInline({ actif, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Aimer"
      className={`shrink-0 self-start transition-colors ${actif ? 'text-or' : 'text-papier/25 hover:text-papier/60'}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={actif ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
        <path d="M12 21s-7.5-4.6-10-9.2C.5 8.4 2.3 5 5.8 5c2 0 3.4 1 4.2 2.3C10.8 6 12.2 5 14.2 5c3.5 0 5.3 3.4 3.8 6.8C19.5 16.4 12 21 12 21z" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

const ONGLETS = [
  { id: 'tout', label: 'Tout' },
  { id: 'abonnements', label: 'Abonnements' },
  { id: 'sorties', label: 'Sorties' },
]

export default function FilActivite({ activite, idsSuivis, mesLikesInitiaux, userId }) {
  const [onglet, setOnglet] = useState('tout')
  const [likes, setLikes] = useState(() => new Set(mesLikesInitiaux))
  const idsSuivisSet = useMemo(() => new Set(idsSuivis), [idsSuivis])
  const supabase = createClient()

  async function basculerLike(chapitreId) {
    if (!chapitreId) return
    if (!userId) {
      window.location.href = '/login'
      return
    }
    const dejaAime = likes.has(chapitreId)
    setLikes((prev) => {
      const next = new Set(prev)
      if (dejaAime) next.delete(chapitreId)
      else next.add(chapitreId)
      return next
    })
    if (dejaAime) {
      await supabase.from('likes').delete().eq('chapitre_id', chapitreId).eq('user_id', userId)
    } else {
      await supabase.from('likes').insert({ chapitre_id: chapitreId, user_id: userId })
    }
  }

  const filtree = activite.filter((a) => {
    if (onglet === 'abonnements') return !!a.user_id && idsSuivisSet.has(a.user_id)
    if (onglet === 'sorties') return a.type === 'premiere'
    return true
  })

  return (
    <div>
      <div className="flex gap-1 mb-8 border-b border-ligne">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            onClick={() => setOnglet(o.id)}
            className={`px-4 py-2.5 text-xs font-mono uppercase tracking-widest transition-colors border-b-2 -mb-px ${
              onglet === o.id ? 'text-or border-or' : 'text-papier/40 border-transparent hover:text-papier/70'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <ul className="divide-y divide-ligne">
        {filtree.map((a) =>
          a.type === 'premiere' ? (
            <li key={a.id} className="py-4 flex gap-3 items-start">
              <div className="w-9 h-9 rounded-full bg-or/15 border border-or/40 flex items-center justify-center shrink-0">
                <span className="text-or text-sm">✨</span>
              </div>
              <div className="min-w-0 text-sm flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-or font-mono text-[0.65rem] uppercase tracking-widest">C&apos;est sorti</span>
                  <span className="text-papier/25 font-mono text-[0.65rem] shrink-0">{tempsRelatif(a.date)}</span>
                </div>
                <p className="text-papier/70 mt-1">
                  <Link href={`/roman/${a.slug}?ch=${a.numero}`} className="text-papier hover:text-or transition-colors">
                    « {a.roman} »
                  </Link>{' '}
                  — chapitre {a.numero}
                  {a.titreChapitre ? ` · ${a.titreChapitre}` : ''} vient de paraître.
                </p>
              </div>
              <CoeurInline actif={likes.has(a.chapitreId)} onClick={() => basculerLike(a.chapitreId)} />
            </li>
          ) : (
            <li key={a.id} className="py-4 flex gap-3">
              {a.profil?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.profil.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-or to-[#0a1a2e] flex items-center justify-center shrink-0">
                  <span className="font-display text-sm text-papier">{initiale(a.profil?.pseudo)}</span>
                </div>
              )}
              <div className="min-w-0 text-sm flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/profil/${a.profil?.pseudo ?? ''}`}
                      className="text-papier font-mono text-xs uppercase tracking-wide hover:text-or transition-colors"
                    >
                      {a.profil?.pseudo ?? 'Lecteur'}
                    </Link>
                    {idsSuivisSet.has(a.user_id) && <span className="text-or text-[0.65rem] font-mono ml-2">· suivi</span>}
                  </div>
                  <span className="text-papier/25 font-mono text-[0.65rem] shrink-0">{tempsRelatif(a.date)}</span>
                </div>
                <p className="mt-0.5">
                  <span className="text-papier/35">{a.type === 'like' ? 'a aimé' : 'a réagi à'} </span>
                  <Link href={`/roman/${a.slug}?ch=${a.numero}`} className="text-papier/60 hover:text-or transition-colors">
                    « {a.roman} », ch. {a.numero}
                  </Link>
                </p>
                {a.type === 'commentaire' && a.contenu && <p className="text-papier/70 mt-1 leading-relaxed">{a.contenu}</p>}
              </div>
              <CoeurInline actif={likes.has(a.chapitreId)} onClick={() => basculerLike(a.chapitreId)} />
            </li>
          )
        )}

        {filtree.length === 0 && (
          <li className="py-16 text-center">
            {onglet === 'abonnements' ? (
              <>
                <p className="text-papier/40 text-sm mb-4">
                  Tu ne suis encore personne, ou tes abonnements n&apos;ont pas d&apos;activité récente.
                </p>
                <Link href="/lecteurs" className="inline-block text-or text-xs font-mono uppercase tracking-widest hover:brightness-125 transition-colors">
                  Découvrir des lecteurs à suivre →
                </Link>
              </>
            ) : onglet === 'sorties' ? (
              <>
                <p className="text-papier/40 text-sm mb-4">Aucune première publiée récemment.</p>
                <Link href="/romans" className="inline-block text-or text-xs font-mono uppercase tracking-widest hover:brightness-125 transition-colors">
                  Explorer le catalogue →
                </Link>
              </>
            ) : (
              <>
                <p className="text-papier/40 text-sm mb-4">Rien pour l&apos;instant. Suis des lecteurs pour animer ton fil.</p>
                <Link href="/lecteurs" className="inline-block text-or text-xs font-mono uppercase tracking-widest hover:brightness-125 transition-colors">
                  Découvrir des lecteurs à suivre →
                </Link>
              </>
            )}
          </li>
        )}
      </ul>
    </div>
  )
}
