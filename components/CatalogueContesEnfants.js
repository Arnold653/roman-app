'use client'

import { useMemo, useState } from 'react'
import { CouvertureConteEnfant } from '@/components/Couvertures'

function Stat({ glyphe, valeur, suffixe = '' }) {
  if (!valeur) return null
  return (
    <span className="inline-flex items-center gap-1 text-papier/45 text-xs font-mono">
      <span>{glyphe}</span>{valeur}{suffixe}
    </span>
  )
}

function CarteConte({ conte, vedette = false }) {
  return (
    <a href={`/contes-enfants/${conte.slug}`} className="group block">
      <div
        className={`relative overflow-hidden rounded-2xl mb-4 shadow-[6px_6px_0_0_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:shadow-[10px_10px_0_0_rgba(0,0,0,0.35)] ${
          vedette ? 'aspect-[16/8.5] sm:aspect-[16/7]' : 'aspect-[3/4.2]'
        }`}
      >
        <CouvertureConteEnfant titre={conte.titre} />
        <div className="absolute inset-0 p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {conte.tranche_age && (
              <span className="font-mono text-[0.65rem] uppercase tracking-widest text-papier/85 border border-papier/30 rounded-full px-2.5 py-1 bg-black/15 backdrop-blur-sm">
                {conte.tranche_age}
              </span>
            )}
            {conte.nouveau && (
              <span className="font-mono text-[0.65rem] uppercase tracking-widest text-encre bg-[#ffd166] rounded-full px-2.5 py-1">
                Nouveau
              </span>
            )}
          </div>
          <div>
            <div className="w-6 h-[1.5px] bg-[#2dd4bf]/70 mb-3" />
            <h2 className={`font-display text-papier leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)] ${vedette ? 'text-3xl md:text-4xl max-w-lg' : 'text-2xl'}`}>
              {conte.titre}
            </h2>
            {conte.auteur && <p className="text-papier/60 text-xs mt-1 font-mono">{conte.auteur}</p>}
          </div>
        </div>

        {conte.sectionEnCours && conte.nbSections > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/30">
            <div className="h-full bg-[#ffd166]" style={{ width: `${Math.min(100, (conte.sectionEnCours / conte.nbSections) * 100)}%` }} />
          </div>
        )}
      </div>

      <p className={`text-papier/45 leading-relaxed ${vedette ? 'text-base max-w-2xl mb-2' : 'text-sm line-clamp-2 mb-2'}`}>{conte.description}</p>

      <div className="flex items-center gap-3 flex-wrap">
        {conte.sectionEnCours ? (
          <span className="text-[#ffd166] text-xs font-mono">Reprendre →</span>
        ) : conte.nbSections > 0 ? (
          <span className="text-papier/35 text-xs font-mono">{conte.nbSections} partie{conte.nbSections > 1 ? 's' : ''}</span>
        ) : null}
        <Stat glyphe="👥" valeur={conte.nbLecteurs} suffixe={conte.nbLecteurs > 1 ? ' lecteurs' : ' lecteur'} />
      </div>
    </a>
  )
}

export default function CatalogueContesEnfants({ contes }) {
  const [recherche, setRecherche] = useState('')
  const [ageActif, setAgeActif] = useState(null)
  const [tri, setTri] = useState('recents') // 'recents' | 'lus' | 'encours'

  const tranches = useMemo(
    () => [...new Set(contes.map((c) => c.tranche_age).filter(Boolean))].sort(),
    [contes]
  )

  const filtres = useMemo(() => {
    let liste = contes.filter((c) => c.titre.toLowerCase().includes(recherche.toLowerCase()))
    if (ageActif) liste = liste.filter((c) => c.tranche_age === ageActif)
    if (tri === 'lus') liste = [...liste].sort((a, b) => b.nbLecteurs - a.nbLecteurs)
    else if (tri === 'encours') liste = liste.filter((c) => c.sectionEnCours)
    else liste = [...liste].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return liste
  }, [contes, recherche, ageActif, tri])

  const vedette = !recherche && !ageActif && tri === 'recents'
    ? [...contes].sort((a, b) => b.nbLecteurs - a.nbLecteurs)[0]
    : null
  const vedetteValide = vedette && vedette.nbLecteurs > 0 ? vedette : null
  const reste = vedetteValide ? filtres.filter((c) => c.id !== vedetteValide.id) : filtres

  return (
    <div className="px-6 pt-16 pb-24 max-w-6xl mx-auto">
      <div className="lever max-w-2xl mb-10">
        <h1 className="font-display text-4xl md:text-5xl text-papier mb-4 leading-tight">Contes pour Enfants</h1>
        <p className="text-papier/50 leading-relaxed">
          Des histoires à lire ou écouter ensemble, avec de grandes images et une lecture pensée pour les petits.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-6">
        <input
          type="text"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Chercher un titre..."
          className="bg-encreClair border border-ligne rounded-full px-4 py-2.5 text-sm text-papier placeholder:text-papier/30 focus:outline-none focus:border-[#ffd166]/50 w-full sm:w-64"
        />
        <div className="flex gap-2 font-mono text-xs uppercase tracking-wide shrink-0">
          {[
            ['recents', 'Récents'],
            ['lus', 'Les plus lus'],
            ['encours', 'En cours'],
          ].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setTri(val)}
              className={`rounded-full px-3 py-1.5 border transition-colors ${
                tri === val ? 'border-[#ffd166] text-[#ffd166]' : 'border-ligne text-papier/45 hover:border-papier/30'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tranches.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-12 font-mono text-xs uppercase tracking-wide">
          <button
            onClick={() => setAgeActif(null)}
            className={`rounded-full px-3 py-1.5 border transition-colors ${!ageActif ? 'border-[#ffd166] text-[#ffd166]' : 'border-ligne text-papier/45 hover:border-papier/30'}`}
          >
            Tous âges
          </button>
          {tranches.map((t) => (
            <button
              key={t}
              onClick={() => setAgeActif(t)}
              className={`rounded-full px-3 py-1.5 border transition-colors ${ageActif === t ? 'border-[#ffd166] text-[#ffd166]' : 'border-ligne text-papier/45 hover:border-papier/30'}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {vedetteValide && (
        <div className="mb-14">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-papier/40 mb-4">Le plus lu</p>
          <CarteConte conte={vedetteValide} vedette />
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {reste.map((conte) => (
          <CarteConte key={conte.id} conte={conte} />
        ))}
      </div>

      {filtres.length === 0 && (
        <p className="text-papier/35 text-sm font-mono">
          {tri === 'encours' ? "Rien en cours pour l'instant — choisis une histoire pour commencer." : 'Aucune histoire ne correspond.'}
        </p>
      )}
    </div>
  )
}
