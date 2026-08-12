'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { extrairePdfDepuisUrl } from '@/lib/extractionPdf'
import CorpsChapitre from './CorpsChapitre'
import LectureAudio from './LectureAudio'

async function televerserImage(slug, nom, dataUrl) {
  try {
    const res = await fetch(`/api/livres/${slug}/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, dataUrl }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.url || null
  } catch {
    return null
  }
}

// Lecteur d'un livre déjà mis en cache (contenuInitial fourni par la page serveur — le cas
// normal pour tout livre passé par le nouveau flux d'upload admin). Ne relance une extraction
// côté client que pour d'anciens livres PDF pas encore ré-uploadés via ce flux.
export default function LecteurPDF({ url, slug, livreId, contenuInitial, sectionInitiale = 0 }) {
  const [sections, setSections] = useState(contenuInitial?.sections || null)
  const [tableMatieres, setTableMatieres] = useState(contenuInitial?.tableMatieres || [])
  const [sectionIndex, setSectionIndex] = useState(sectionInitiale)
  const [chargement, setChargement] = useState(!contenuInitial)
  const [progression, setProgression] = useState(0)
  const [erreur, setErreur] = useState('')
  const [tocOuverte, setTocOuverte] = useState(false)
  const cibleScrollRef = useRef(null)
  const premierRenduRef = useRef(true)

  useEffect(() => {
    if (contenuInitial) return
    let annule = false

    async function charger() {
      try {
        const resultat = await extrairePdfDepuisUrl(
          url,
          slug ? (nom, dataUrl) => televerserImage(slug, nom, dataUrl) : null,
          (p) => { if (!annule) setProgression(p) }
        )
        if (annule) return
        setTableMatieres(resultat.tableMatieres)
        setSections(resultat.sections)
        setChargement(false)

        if (slug) {
          fetch(`/api/livres/${slug}/cache`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contenu: resultat }),
          }).catch(() => {})
        }
      } catch (e) {
        if (!annule) { setErreur(`Impossible de charger ce livre (${e?.message || e}).`); setChargement(false) }
      }
    }

    charger()
    return () => { annule = true }
  }, [url, slug, contenuInitial])

  useEffect(() => {
    if (!sections) return
    if (premierRenduRef.current) { premierRenduRef.current = false; return }
    if (!livreId) return

    async function enregistrer() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('lecture_progress_livres').upsert({
        user_id: user.id,
        livre_id: livreId,
        derniere_section: sectionIndex,
        updated_at: new Date().toISOString(),
      })
    }
    enregistrer()
  }, [sectionIndex, sections, livreId])

  useEffect(() => {
    if (!sections) return
    const id = cibleScrollRef.current
    cibleScrollRef.current = null
    requestAnimationFrame(() => {
      if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      else window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }, [sectionIndex, sections])

  function allerAuTitre(indexGlobal) {
    const k = sections.findIndex((s) => indexGlobal >= s.debut && indexGlobal < s.fin)
    if (k === -1) return
    const idLocal = `p-${indexGlobal - sections[k].debut}`
    cibleScrollRef.current = idLocal
    setSectionIndex(k)
    setTocOuverte(false)
  }

  if (erreur) return <p className="text-papier/40 text-sm font-mono py-6">{erreur}</p>

  if (chargement || !sections) {
    return (
      <div className="py-10">
        <p className="text-papier/35 text-sm font-mono">Préparation du texte... {progression}%</p>
      </div>
    )
  }

  const indexEffectif = Math.min(sectionIndex, sections.length - 1)
  const section = sections[indexEffectif]

  const texteSection = section.blocs
    .map((p) => {
      if (p.type === 'image') return `§IMAGE§${p.url}`
      if (p.type === 'tableau') return `§TABLEAU§${JSON.stringify(p.lignes)}`
      return p.titre ? `§TITRE§${p.texte}` : p.texte
    })
    .join('\n\n')

  const titreAudio = section.blocs[0]?.type === 'texte' && section.blocs[0]?.titre ? section.blocs[0].texte : ''
  const texteAudio = (titreAudio ? section.blocs.slice(1) : section.blocs)
    .filter((p) => p.type === 'texte')
    .map((p) => p.texte)
    .join('\n\n')

  return (
    <div>
      {tableMatieres.length > 1 && (
        <div className="mb-8">
          <button
            onClick={() => setTocOuverte((v) => !v)}
            className="text-xs font-mono uppercase tracking-widest text-papier/50 hover:text-or transition-colors border border-ligne rounded-full px-3 py-1.5"
          >
            Table des matières {tocOuverte ? '▴' : '▾'}
          </button>
          {tocOuverte && (
            <div className="border border-ligne rounded-lg p-4 mt-2">
              <ul className="space-y-1.5">
                {tableMatieres.map((t) => (
                  <li key={t.index} style={{ paddingLeft: `${(t.niveau - 1) * 14}px` }}>
                    <button
                      onClick={() => allerAuTitre(t.index)}
                      className={`text-left transition-colors hover:text-or ${
                        t.niveau === 1
                          ? 'text-papier/85 text-sm font-semibold uppercase tracking-wide'
                          : t.niveau === 2
                          ? 'text-papier/70 text-sm'
                          : 'text-papier/40 text-xs italic'
                      }`}
                    >
                      {t.texte}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {sections.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {sections.map((s, i) => (
            <button
              key={i}
              onClick={() => setSectionIndex(i)}
              className={`font-mono text-xs rounded-full px-3 py-1 border transition-colors ${
                i === indexEffectif ? 'border-or text-or' : 'border-papier/15 text-papier/35 hover:border-papier/35 hover:text-papier/60'
              }`}
            >
              {s.pilLabel}
            </button>
          ))}
        </div>
      )}

      <div className="mb-8">
        <LectureAudio texte={texteAudio} titre={titreAudio} />
      </div>

      <CorpsChapitre texte={texteSection} />

      {sections.length > 1 && (
        <div className="flex items-center justify-between mt-16 pt-8 border-t border-ligne font-mono text-sm">
          {indexEffectif > 0 ? (
            <button onClick={() => setSectionIndex(indexEffectif - 1)} className="text-papier/50 hover:text-or transition-colors">
              ← {sections[indexEffectif - 1].pilLabel}
            </button>
          ) : <span />}
          {indexEffectif < sections.length - 1 ? (
            <button onClick={() => setSectionIndex(indexEffectif + 1)} className="text-papier/50 hover:text-or transition-colors">
              {sections[indexEffectif + 1].pilLabel} →
            </button>
          ) : <span />}
        </div>
      )}

      <p className="text-papier/25 text-xs font-mono mt-8 text-center">
        Texte extrait automatiquement — de rares écarts de mise en forme sont possibles selon le document source.
      </p>
    </div>
  )
}
