'use client'

import { useEffect, useRef, useState } from 'react'

// Lecture audio du chapitre via la synthèse vocale du navigateur (gratuite, aucun serveur requis).
// La qualité dépend de l'appareil/navigateur, mais fonctionne sans configuration.
export default function LectureAudio({ texte, titre }) {
  const [etat, setEtat] = useState('arret') // arret | lecture | pause
  const [disponible, setDisponible] = useState(true)
  const utteranceRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setDisponible(false)
    }
    return () => {
      window.speechSynthesis?.cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function texteAudible() {
    // Retire la mise en forme (**, #, *) et les séparateurs pour une lecture propre
    return texte
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/#(.+?)#/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/^(---+|\*\*\*+|___+)$/gm, '')
  }

  function demarrer() {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(`${titre ? titre + '. ' : ''}${texteAudible()}`)
    u.lang = 'fr-FR'
    u.rate = 0.98
    u.onend = () => setEtat('arret')
    u.onerror = () => setEtat('arret')
    utteranceRef.current = u
    window.speechSynthesis.speak(u)
    setEtat('lecture')
  }

  function basculerPause() {
    if (etat === 'lecture') {
      window.speechSynthesis.pause()
      setEtat('pause')
    } else if (etat === 'pause') {
      window.speechSynthesis.resume()
      setEtat('lecture')
    }
  }

  function arreter() {
    window.speechSynthesis.cancel()
    setEtat('arret')
  }

  if (!disponible) return null

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-ligne px-1.5 py-1.5">
      {etat === 'arret' ? (
        <button onClick={demarrer} className="flex items-center gap-2 text-sm text-papier/60 hover:text-or transition-colors pl-2 pr-3">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          Écouter ce chapitre
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
