'use client'

import { useMemo, useState } from 'react'
import { CouvertureGeneree } from '@/components/Couvertures'
import { degradeDe } from '@/lib/couvertures'

function Stat({ glyphe, valeur }) {
  if (!valeur) return null
  return (
    <span className="inline-flex items-center gap-1 text-papier/45 text-xs font-mono">
      <span>{glyphe}</span>{valeur}
    </span>
  )
}

function CarteRoman({ roman, vedette = false }) {
  const [d1, d2, d3] = degradeDe(roman.id)
  return (
    <a href={`/roman/${roman.slug}`} className="group block">
      <div
        className={`relative overflow-hidden rounded-md mb-4 shadow-[6px_6px_0_0_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:shadow-[10px_10px_0_0_rgba(0,0,0,0.35)] ${
          vedette ? 'aspect-[16/8.5] sm:aspect-[16/7]' : 'aspect-[3/4.2]'
        }`}
        style={{ background: roman.couverture_url ? undefined : `linear-gradient(160deg, ${d1} 0%, ${d2} 55%, ${d3} 100%)` }}
      >
        {roman.couverture_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={roman.couverture_url} alt={roman.titre} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <CouvertureGeneree id={roman.id} titre={roman.titre} />
        )}
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-black/30" />

        <div className="absolute inset-0 p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[0.65rem] uppercase tracking-widest text-papier/80 border border-papier/30 rounded-full px-2.5 py-1 bg-black/10 backdrop-blur-sm">
              {roman.genre}
            </span>
            {roman.nouveau && (
              <span className="font-mono text-[0.65rem] uppercase tracking-widest text-encre bg-or rounded-full px-2.5 py-1">
                Nouveau chapitre
              </span>
            )}
            {roman.publie_le && new Date(roman.publie_le) > new Date() && roman.prix_fcfa > 0 && (
              <span className="font-mono text-[0.65rem] uppercase tracking-widest text-papier/80 border border-grenat/60 rounded-full px-2.5 py-1 bg-black/10 backdrop-blur-sm">
                🔒 En Première
              </span>
            )}
            {roman.prochainePremiere && (
              <span className="font-mono text-[0.65rem] uppercase tracking-widest text-or border border-or/40 rounded-full px-2.5 py-1 bg-black/10 backdrop-blur-sm">
                Prochaine sortie {new Date(roman.prochainePremiere).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
          <div>
            <div className="w-6 h-[1.5px] bg-or/70 mb-3" />
            <h2 className={`font-display text-papier leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)] ${vedette ? 'text-3xl md:text-4xl max-w-lg' : 'text-2xl'}`}>
              {roman.titre}
            </h2>
          </div>
        </div>

        {roman.chapitreEnCours && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/30">
            <div className="h-full bg-or" style={{ width: `${Math.min(100, (roman.chapitreEnCours / Math.max(roman.nbChapitres, 1)) * 100)}%` }} />
          </div>
        )}
      </div>

      <p className={`text-papier/45 leading-relaxed ${vedette ? 'text-base max-w-2xl mb-2' : 'text-sm line-clamp-2 mb-2'}`}>{roman.resume}</p>

      <div className="flex items-center gap-3 flex-wrap">
        {roman.chapitreEnCours ? (
          <span className="text-or text-xs font-mono">Reprendre — ch. {roman.chapitreEnCours} →</span>
        ) : (
          <span className="text-papier/35 text-xs font-mono">{roman.nbChapitres} chapitre{roman.nbChapitres > 1 ? 's' : ''}</span>
        )}
        <Stat glyphe="♥" valeur={roman.nbLikes} />
        <Stat glyphe="💬" valeur={roman.nbCommentaires} />
      </div>
    </a>
  )
}

export default function CatalogueRomans({ romans }) {
  const [recherche, setRecherche] = useState('')
  const [genreActif, setGenreActif] = useState(null)
  const [tri, setTri] = useState('recents') // 'recents' | 'populaires' | 'encours'

  const genres = useMemo(
    () => [...new Set(romans.map((r) => r.genre).filter(Boolean))].sort(),
    [romans]
  )

  const filtres = useMemo(() => {
    let liste = romans.filter((r) => r.titre.toLowerCase().includes(recherche.toLowerCase()))
    if (genreActif) liste = liste.filter((r) => r.genre === genreActif)
    if (tri === 'populaires') liste = [...liste].sort((a, b) => (b.nbLikes * 2 + b.nbCommentaires) - (a.nbLikes * 2 + a.nbCommentaires))
    else if (tri === 'encours') liste = liste.filter((r) => r.chapitreEnCours)
    else liste = [...liste].sort((a, b) => new Date(b.dernierePublication) - new Date(a.dernierePublication))
    return liste
  }, [romans, recherche, genreActif, tri])

  // Vedette : le roman qui a le plus de traction, mis en avant seulement sur la vue par défaut
  // (pas de vedette une fois qu'on cherche/filtre — ça n'aurait plus de sens).
  const vedette = !recherche && !genreActif && tri === 'recents'
    ? [...romans].sort((a, b) => (b.nbLikes * 2 + b.nbCommentaires) - (a.nbLikes * 2 + a.nbCommentaires))[0]
    : null
  const reste = vedette ? filtres.filter((r) => r.id !== vedette.id) : filtres

  return (
    <div className="px-6 pt-16 pb-24 max-w-6xl mx-auto">
      <div className="lever max-w-2xl mb-10">
        <h1 className="font-display text-4xl md:text-5xl text-papier mb-4 leading-tight">Romans</h1>
        <p className="text-papier/50 leading-relaxed">
          Des histoires publiées chapitre par chapitre, à lire ou à écouter au fil de leur sortie.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-6">
        <input
          type="text"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Chercher un titre..."
          className="bg-encreClair border border-ligne rounded-full px-4 py-2.5 text-sm text-papier placeholder:text-papier/30 focus:outline-none focus:border-or/50 w-full sm:w-64"
        />
        <div className="flex gap-2 font-mono text-xs uppercase tracking-wide shrink-0">
          {[
            ['recents', 'Récents'],
            ['populaires', 'Populaires'],
            ['encours', 'En cours'],
          ].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setTri(val)}
              className={`rounded-full px-3 py-1.5 border transition-colors ${
                tri === val ? 'border-or text-or' : 'border-ligne text-papier/45 hover:border-papier/30'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {genres.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-12 font-mono text-xs uppercase tracking-wide">
          <button
            onClick={() => setGenreActif(null)}
            className={`rounded-full px-3 py-1.5 border transition-colors ${!genreActif ? 'border-or text-or' : 'border-ligne text-papier/45 hover:border-papier/30'}`}
          >
            Tous
          </button>
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => setGenreActif(g)}
              className={`rounded-full px-3 py-1.5 border transition-colors ${genreActif === g ? 'border-or text-or' : 'border-ligne text-papier/45 hover:border-papier/30'}`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {vedette && (
        <div className="mb-14">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-papier/40 mb-4">En ce moment</p>
          <CarteRoman roman={vedette} vedette />
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {reste.map((roman) => (
          <CarteRoman key={roman.id} roman={roman} />
        ))}
      </div>

      {filtres.length === 0 && (
        <p className="text-papier/35 text-sm font-mono">
          {tri === 'encours' ? "Rien en cours pour l'instant — choisis un roman pour commencer." : 'Aucun roman ne correspond.'}
        </p>
      )}
    </div>
  )
}
