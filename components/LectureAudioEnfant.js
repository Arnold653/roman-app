'use client'

import { useEffect, useRef, useState } from 'react'

// Variante de LectureAudio.js pensée pour les Contes pour Enfants : voix/hauteur/débit adaptés
// à une lecture d'histoire, boutons plus grands, surlignage du paragraphe en cours de narration
// (en ciblant directement les mêmes id="p-N" que CorpsChapitre.js, sans dupliquer le texte
// affiché ni perdre les images/titres/citations qu'il sait déjà rendre), et lecture automatique
// (démarre seule à l'ouverture, enchaîne sur la section suivante une fois la précédente finie).
// Les mêmes contournements Chrome desktop (watchdog 15s) / Android (pause() casse l'utterance)
// que LectureAudio.js s'appliquent ici, voir les commentaires de ce fichier pour le détail.
function estAndroid() {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
}

// Classes Tailwind statiques (jamais interpolées) appliquées/retirées via classList sur le
// paragraphe en cours de lecture — cohérent avec la contrainte du projet sur le JIT Tailwind.
const CLASSES_SURLIGNAGE = ['bg-[#ffd166]/15', 'rounded-lg', 'ring-1', 'ring-[#ffd166]/40', 'transition-colors']

const CLE_PREFERENCE_AUTO = 'encre_conte_enfant_lecture_auto'

export default function LectureAudioEnfant({
  narrationUnites, // [{ texte, id }] — id = l'id DOM exact du <p id="p-N"> rendu par CorpsChapitre
  titre,
  demarrerAuto = false,
  aSectionSuivante = false,
  onSectionTerminee,
}) {
  const [etat, setEtat] = useState('arret') // arret | lecture | pause | erreur
  const [disponible, setDisponible] = useState(true)
  const [erreurDetail, setErreurDetail] = useState('')
  const [lectureAuto, setLectureAuto] = useState(true)
  const intervalleRef = useRef(null)
  const utterancesRef = useRef([])
  const indexActifRef = useRef(0)
  const elementSurligneRef = useRef(null)
  const aDemarreRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setDisponible(false)
      return
    }
    const pref = window.localStorage.getItem(CLE_PREFERENCE_AUTO)
    if (pref !== null) setLectureAuto(pref === 'true')

    return () => {
      window.speechSynthesis?.cancel()
      clearInterval(intervalleRef.current)
      retirerSurlignage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function retirerSurlignage() {
    if (elementSurligneRef.current) {
      elementSurligneRef.current.classList.remove(...CLASSES_SURLIGNAGE)
      elementSurligneRef.current = null
    }
  }

  function surlignerParagraphe(index) {
    retirerSurlignage()
    const unite = narrationUnites[index]
    if (!unite) return
    const el = document.getElementById(unite.id)
    if (!el) return
    el.classList.add(...CLASSES_SURLIGNAGE)
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    elementSurligneRef.current = el
  }

  // Le Web Speech API n'expose pas de vraie "voix enfant" de façon fiable et cohérente d'un
  // navigateur à l'autre. On privilégie une voix explicitement nommée en ce sens si la
  // plateforme en propose une (rare), sinon la meilleure voix française disponible, avec un
  // pitch/débit ajustés (plus chaleureux, un peu plus lent) comme proxy pratique.
  function choisirVoix(synth) {
    const voix = synth.getVoices()
    const voixDediee = voix.find((v) => v.lang?.startsWith('fr') && /enfant|junior|child|kids/i.test(v.name))
    if (voixDediee) return voixDediee
    return voix.find((v) => v.lang?.startsWith('fr')) || null
  }

  function lancerDepuis(indexDepart) {
    const synth = window.speechSynthesis
    synth.cancel()

    const voix = choisirVoix(synth)
    const sousListe = narrationUnites.slice(indexDepart)

    const listeUtterances = sousListe.map((unite, i) => {
      const indexReel = indexDepart + i
      const u = new SpeechSynthesisUtterance(unite.texte)
      u.lang = 'fr-FR'
      u.rate = 0.92
      u.pitch = 1.15
      if (voix) u.voice = voix

      u.onstart = () => {
        indexActifRef.current = indexReel
        setEtat('lecture')
        surlignerParagraphe(indexReel)
      }

      if (indexReel === narrationUnites.length - 1) {
        u.onend = () => {
          setEtat('arret')
          clearInterval(intervalleRef.current)
          retirerSurlignage()
          utterancesRef.current = []
          if (lectureAuto && aSectionSuivante && onSectionTerminee) onSectionTerminee()
        }
      }
      u.onerror = (e) => {
        // cf. LectureAudio.js : "interrupted"/"canceled" est normal lors d'une pause ou d'un
        // changement de bloc/section, pas une vraie erreur.
        if (e.error === 'interrupted' || e.error === 'canceled') return
        setErreurDetail(e.error || 'inconnue')
        setEtat('erreur')
        clearInterval(intervalleRef.current)
        utterancesRef.current = []
      }
      return u
    })

    utterancesRef.current = listeUtterances
    listeUtterances.forEach((u) => synth.speak(u))

    clearInterval(intervalleRef.current)
    if (!estAndroid()) {
      intervalleRef.current = setInterval(() => {
        if (synth.speaking && !synth.paused) {
          synth.pause()
          synth.resume()
        }
      }, 10000)
    }
  }

  function demarrer() {
    if (!narrationUnites.length) return
    indexActifRef.current = 0
    lancerDepuis(0)
  }

  // Lecture automatique : tentative de démarrage seul à l'arrivée sur la section (ouverture de
  // l'histoire, ou enchaînement depuis la section précédente). Un léger délai laisse le temps
  // à getVoices() de se peupler (vide au tout premier appel sur certains navigateurs). Si le
  // navigateur bloque l'autoplay audio (ex. avant toute interaction), le bouton de lecture
  // reste simplement visible et fonctionnel — aucune erreur affichée pour une tentative silencieuse.
  useEffect(() => {
    if (!disponible || !narrationUnites.length || aDemarreRef.current) return
    aDemarreRef.current = true
    if (demarrerAuto && lectureAuto) {
      const t = setTimeout(() => demarrer(), 300)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disponible, narrationUnites])

  function basculerPause() {
    const synth = window.speechSynthesis
    if (etat === 'lecture') {
      if (estAndroid()) {
        clearInterval(intervalleRef.current)
        synth.cancel()
      } else {
        synth.pause()
      }
      setEtat('pause')
    } else if (etat === 'pause') {
      if (estAndroid()) {
        lancerDepuis(indexActifRef.current)
      } else {
        synth.resume()
        setEtat('lecture')
      }
    } else {
      demarrer()
    }
  }

  function arreter() {
    window.speechSynthesis.cancel()
    clearInterval(intervalleRef.current)
    retirerSurlignage()
    setEtat('arret')
  }

  function basculerLectureAuto() {
    setLectureAuto((v) => {
      const nouvelleValeur = !v
      window.localStorage.setItem(CLE_PREFERENCE_AUTO, String(nouvelleValeur))
      return nouvelleValeur
    })
  }

  if (!disponible) return null

  return (
    <div className="flex items-center gap-3 flex-wrap mb-8">
      {etat === 'arret' || etat === 'erreur' ? (
        <button
          onClick={demarrer}
          className="flex items-center gap-3 rounded-full bg-[#ffd166] text-encre pl-2 pr-5 py-2 font-mono text-sm font-medium hover:brightness-105 active:scale-95 transition-all shadow-lg shadow-[#ffd166]/20"
        >
          <span className="w-11 h-11 rounded-full bg-encre/10 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </span>
          {etat === 'erreur' ? `Réessayer (${erreurDetail})` : `Écouter ${titre ? `« ${titre} »` : "l'histoire"}`}
        </button>
      ) : (
        <div className="flex items-center gap-3 rounded-full bg-encreClair border border-[#ffd166]/30 pl-2 pr-4 py-2">
          <button
            onClick={basculerPause}
            aria-label={etat === 'lecture' ? 'Pause' : 'Reprendre'}
            className="w-11 h-11 rounded-full bg-[#ffd166] text-encre flex items-center justify-center hover:brightness-105 active:scale-95 transition-all shrink-0"
          >
            {etat === 'lecture' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>
          <span className="text-sm text-papier/70 font-mono">{etat === 'lecture' ? "On lit l'histoire..." : 'Pause'}</span>
          <button
            onClick={arreter}
            aria-label="Arrêter"
            className="w-8 h-8 rounded-full flex items-center justify-center text-papier/40 hover:text-papier/70 hover:bg-papier/5 transition-colors shrink-0"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" /></svg>
          </button>
        </div>
      )}

      <button
        onClick={basculerLectureAuto}
        className={`font-mono text-xs rounded-full px-3 py-2 border transition-colors ${
          lectureAuto ? 'border-[#4fd1c5]/50 text-[#4fd1c5]' : 'border-papier/15 text-papier/35 hover:border-papier/35'
        }`}
      >
        {lectureAuto ? '● Lecture automatique' : 'Lecture automatique désactivée'}
      </button>
    </div>
  )
}
