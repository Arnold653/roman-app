'use client'

import { useEffect, useRef, useState } from 'react'

// Lecture audio du chapitre via la synthèse vocale du navigateur (gratuite, aucun serveur requis).
// Contient plusieurs contournements pour des bugs connus de Chrome/Android :
// - speak() juste après cancel() est parfois ignoré silencieusement -> léger délai
// - la synthèse se met en pause automatiquement après ~15s sur certains appareils -> resume() en boucle
export default function LectureAudio({ texte, titre }) {
  const [etat, setEtat] = useState('arret') // arret | lecture | pause | erreur
  const [disponible, setDisponible] = useState(true)
  const intervalleRef = useRef(null)

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

  function demarrer() {
    const synth = window.speechSynthesis
    synth.cancel()

    // Contournement Chrome : un speak() immédiatement après cancel() est parfois avalé
    setTimeout(() => {
      const u = new SpeechSynthesisUtterance(`${titre ? titre + '. ' : ''}${texteAudible()}`)
      u.lang = 'fr-FR'
      u.rate = 0.98

      const voix = synth.getVoices().find((v) => v.lang?.startsWith('fr'))
      if (voix) u.voice = voix

      u.onend = () => { setEtat('arret'); clearInterval(intervalleRef.current) }
      u.onerror = () => { setEtat('erreur'); clearInterval(intervalleRef.current) }

      synth.speak(u)
      setEtat('lecture')

      // Contournement Android/Chrome : la synthèse se coupe seule après ~15s sans ce hack
      clearInterval(intervalleRef.current)
      intervalleRef.current = setInterval(() => {
        if (synth.speaking && !synth.paused) {
          synth.pause()
          synth.resume()
        }
      }, 10000)
    }, 80)
  }

  function basculerPause() {
    const synth = window.speechSynthesis
    if (etat === 'lecture') {
      synth.pause()
      setEtat('pause')
    } else if (etat === 'pause') {
      synth.resume()
      setEtat('lecture')
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
          {etat === 'erreur' ? "Réessayer l'écoute" : 'Écouter ce chapitre'}
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

