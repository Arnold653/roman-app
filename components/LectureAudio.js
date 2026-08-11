'use client'

import { useEffect, useRef, useState } from 'react'

// Lecture audio du chapitre via la synthèse vocale du navigateur (gratuite, aucun serveur requis).
// Contient plusieurs contournements pour des bugs connus de Chrome :
// - speak() juste après cancel() est parfois ignoré silencieusement -> léger délai
// - sur Chrome DESKTOP (voix réseau), la synthèse se met en pause automatiquement après ~15s
//   -> on la relance avec pause()/resume() en boucle
// - sur Chrome ANDROID, pause() termine l'utterance en cours et resume() ne fait rien
//   (bug Chromium connu, jamais corrigé) : le contournement ci-dessus y CASSE le son
//   au lieu de le réparer. Android utilise des voix locales et n'a pas ce bug des 15s,
//   donc on désactive le contournement sur Android, et on gère la pause/reprise manuelle
//   différemment : on mémorise le bloc en cours et on relance dessus au lieu d'appeler resume().
function estAndroid() {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
}

export default function LectureAudio({ texte, titre }) {
  const [etat, setEtat] = useState('arret') // arret | lecture | pause | erreur
  const [disponible, setDisponible] = useState(true)
  const [erreurDetail, setErreurDetail] = useState('')
  const intervalleRef = useRef(null)
  const utterancesRef = useRef([])
  const blocsRef = useRef([])
  const blocIndexRef = useRef(0)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setDisponible(false)
    }
    return () => {
      window.speechSynthesis?.cancel()
      clearInterval(intervalleRef.current)
    }
  }, [])

  function texteAudible() {
    return texte
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/#(.+?)#/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/^(---+|\*\*\*+|___+)$/gm, '')
  }

  // De nombreux moteurs TTS Android tronquent ou échouent silencieusement au-delà
  // d'environ 3500-4000 caractères par appel — on découpe donc en blocs plus courts,
  // sur des limites de phrases, et on les enchaîne.
  function decouperEnBlocs(texte, tailleMax = 3000) {
    const phrases = texte.split(/(?<=[.!?…])\s+/)
    const blocs = []
    let bloc = ''
    for (const phrase of phrases) {
      if ((bloc + ' ' + phrase).length > tailleMax && bloc) {
        blocs.push(bloc.trim())
        bloc = phrase
      } else {
        bloc = bloc ? `${bloc} ${phrase}` : phrase
      }
    }
    if (bloc) blocs.push(bloc.trim())
    return blocs
  }

  // Construit les utterances à partir du bloc `indexDepart` et lance la lecture.
  // Réutilisé au démarrage (indexDepart = 0) et lors d'une reprise sur Android
  // (indexDepart = dernier bloc en cours quand la pause a été demandée), puisque
  // resume() n'y fonctionne pas (voir notes en tête de fichier).
  function lancerDepuis(indexDepart) {
    const synth = window.speechSynthesis
    synth.cancel()

    const voix = synth.getVoices().find((v) => v.lang?.startsWith('fr'))
    const blocs = blocsRef.current
    const sousListe = blocs.slice(indexDepart)

    // Les objets utterance doivent rester référencés quelque part tant qu'ils jouent :
    // s'ils ne sont référencés que par une variable locale de boucle, certains navigateurs
    // les ramassent (garbage collection) en plein milieu de la lecture, ce qui coupe le son
    // net après quelques secondes. On les garde donc tous dans une ref qui survit au rendu.
    const listeUtterances = sousListe.map((bloc, i) => {
      const indexReel = indexDepart + i
      const u = new SpeechSynthesisUtterance(bloc)
      u.lang = 'fr-FR'
      u.rate = 0.98
      if (voix) u.voice = voix

      // On mémorise quel bloc est en train d'être lu, pour pouvoir reprendre au bon
      // endroit sur Android si l'utilisateur met en pause.
      u.onstart = () => { blocIndexRef.current = indexReel }

      if (indexReel === blocs.length - 1) {
        u.onend = () => { setEtat('arret'); clearInterval(intervalleRef.current); utterancesRef.current = [] }
      }
      u.onerror = (e) => {
        // Sur Android, cancel() déclenche un onerror "interrupted"/"canceled" pour l'utterance
        // en cours : c'est normal lors d'une pause manuelle ou d'un changement de bloc, pas une vraie erreur.
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

    setEtat('lecture')

    // Contournement Chrome desktop uniquement : la synthèse se coupe seule après ~15s
    // sans ce hack. Sur Android, ce même hack casse la lecture (voir note en tête de fichier).
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
    blocsRef.current = decouperEnBlocs(`${titre ? titre + '. ' : ''}${texteAudible()}`)
    blocIndexRef.current = 0
    lancerDepuis(0)
  }

  function basculerPause() {
    const synth = window.speechSynthesis
    if (etat === 'lecture') {
      if (estAndroid()) {
        // pause() y termine l'utterance en cours pour de bon : on annule et on mémorise
        // simplement le bloc en cours pour pouvoir relancer dessus au clic sur "reprendre".
        clearInterval(intervalleRef.current)
        synth.cancel()
      } else {
        synth.pause()
      }
      setEtat('pause')
    } else if (etat === 'pause') {
      if (estAndroid()) {
        lancerDepuis(blocIndexRef.current)
      } else {
        synth.resume()
        setEtat('lecture')
      }
    }
  }

  function arreter() {
    window.speechSynthesis.cancel()
    clearInterval(intervalleRef.current)
    setEtat('arret')
  }

  if (!disponible) return null

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-ligne px-1.5 py-1.5">
      {etat === 'arret' || etat === 'erreur' ? (
        <button onClick={demarrer} className="flex items-center gap-2 text-sm text-papier/60 hover:text-or transition-colors pl-2 pr-3">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          {etat === 'erreur' ? `Réessayer (${erreurDetail})` : 'Écouter ce chapitre'}
        </button>
      ) : (
        <>
          <button onClick={basculerPause} aria-label={etat === 'lecture' ? 'Pause' : 'Reprendre'} className="w-7 h-7 rounded-full bg-or text-encre flex items-center justify-center">
            {etat === 'lecture' ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>
          <span className="text-xs text-papier/50 font-mono">{etat === 'lecture' ? 'Lecture...' : 'Pause'}</span>
          <button onClick={arreter} aria-label="Arrêter" className="text-papier/40 hover:text-papier/70 pr-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" /></svg>
          </button>
        </>
      )}
    </div>
  )
}
