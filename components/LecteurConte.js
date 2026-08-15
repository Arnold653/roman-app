'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { extrairePdfDepuisUrl } from '@/lib/extractionPdf'
import CorpsChapitre, { decouperEnParagraphes } from './CorpsChapitre'
import LectureAudio from './LectureAudio'
import LectureAudioEnfant from './LectureAudioEnfant'

async function televerserImage(baseApi, slug, nom, dataUrl) {
  try {
    const res = await fetch(`${baseApi}/${slug}/image`, {
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

// Lecteur générique pour un contenu de type "conte" (PDF/EPUB/DOCX/texte extrait), sur le même
// principe que LecteurPDF (livres) mais paramétré par table/API pour servir aussi bien les
// Contes Africains que les Contes pour Enfants sans dupliquer ce composant.
//   baseApi     : ex. '/api/contes-africains'  (routes [slug]/image et [slug]/cache)
//   table       : ex. 'lecture_progress_contes_africains'
//   colonneId   : ex. 'conte_id'
export default function LecteurConte({
  url, slug, contenuId, contenuInitial, sectionInitiale = 0,
  baseApi, tableProgression, colonneId, tailleGrande = false,
}) {
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
          slug ? (nom, dataUrl) => televerserImage(baseApi, slug, nom, dataUrl) : null,
          (p) => { if (!annule) setProgression(p) }
        )
        if (annule) return
        setTableMatieres(resultat.tableMatieres)
        setSections(resultat.sections)
        setChargement(false)

        if (slug) {
          fetch(`${baseApi}/${slug}/cache`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contenu: resultat }),
          }).catch(() => {})
        }
      } catch (e) {
        if (!annule) { setErreur(`Impossible de charger ce contenu (${e?.message || e}).`); setChargement(false) }
      }
    }

    charger()
    return () => { annule = true }
  }, [url, slug, contenuInitial, baseApi])

  useEffect(() => {
    if (!sections) return
    if (premierRenduRef.current) { premierRenduRef.current = false; return }
    if (!contenuId || !tableProgression) return

    async function enregistrer() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from(tableProgression).upsert({
        user_id: user.id,
        [colonneId]: contenuId,
        derniere_section: sectionIndex,
        updated_at: new Date().toISOString(),
      })
    }
    enregistrer()
  }, [sectionIndex, sections, contenuId, tableProgression, colonneId])

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
      if (p.citation) return `§CITATION§${p.texte}`
      return p.titre ? `§TITRE${p.niveau || 2}§${p.texte}` : p.texte
    })
    .join('\n\n')

  const titreAudio = section.blocs[0]?.type === 'texte' && section.blocs[0]?.titre ? section.blocs[0].texte : ''
  const texteAudio = (titreAudio ? section.blocs.slice(1) : section.blocs)
    .filter((p) => p.type === 'texte')
    .map((p) => p.texte)
    .join('\n\n')

  // Pour les Contes Enfants (tailleGrande), le lecteur audio a besoin de cibler les mêmes
  // <p id="p-N"> que CorpsChapitre rend réellement, pour pouvoir surligner le paragraphe en
  // cours de narration sans dupliquer le texte affiché ni perdre titres/images/citations.
  // On réutilise donc EXACTEMENT le même découpage que CorpsChapitre (texteSection, pas
  // texteAudio) puis on écarte les marqueurs non-narratifs (titres, citations, images,
  // tableaux, séparateurs) et le formatage inline (**gras**, #gras#, *italique*).
  const narrationUnites = tailleGrande
    ? decouperEnParagraphes(texteSection)
        .map((texte, i) => ({ texte, id: `p-${i}` }))
        .filter((u) => !/^§(TITRE\d?|CITATION|IMAGE|TABLEAU|SEPARATEUR)§/.test(u.texte))
        .map((u) => ({ ...u, texte: u.texte.replace(/\*\*(.+?)\*\*/g, '$1').replace(/#(.+?)#/g, '$1').replace(/\*(.+?)\*/g, '$1') }))
        .filter((u) => u.texte.trim().length > 0)
    : []

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
                          : t.niveau === 3
                          ? 'text-papier/50 text-xs italic'
                          : t.niveau === 4
                          ? 'text-papier/40 text-xs italic'
                          : 'text-papier/35 text-[0.7rem] font-mono uppercase tracking-wide'
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
        {tailleGrande ? (
          <LectureAudioEnfant
            key={indexEffectif}
            narrationUnites={narrationUnites}
            titre={titreAudio}
            demarrerAuto
            aSectionSuivante={indexEffectif < sections.length - 1}
            onSectionTerminee={() => setSectionIndex((i) => Math.min(i + 1, sections.length - 1))}
          />
        ) : (
          <LectureAudio texte={texteAudio} titre={titreAudio} />
        )}
      </div>

      <CorpsChapitre texte={texteSection} tailleGrande={tailleGrande} />

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
