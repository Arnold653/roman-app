'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Page atterrissage du lien envoyé par resetPasswordForEmail (voir app/login/page.js).
// Supabase établit automatiquement une session "recovery" à l'arrivée sur cette page (le lien
// contient les tokens en fragment d'URL, gérés côté client par le SDK) — il suffit ensuite
// d'appeler updateUser({ password }) pour fixer le nouveau mot de passe.
export default function ReinitialiserMotDePassePage() {
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [termine, setTermine] = useState(false)

  const supabase = createClient()

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')

    if (motDePasse.length < 6) {
      setMessage('6 caractères minimum.')
      return
    }
    if (motDePasse !== confirmation) {
      setMessage('Les deux mots de passe ne correspondent pas.')
      return
    }

    const { error } = await supabase.auth.updateUser({ password: motDePasse })
    if (error) setMessage(error.message)
    else setTermine(true)
  }

  const champ = (props) => (
    <input
      {...props}
      className="w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier placeholder:text-papier/30 focus:outline-none focus:border-or transition-colors"
    />
  )

  return (
    <div className="px-6 pt-20 pb-24 max-w-sm mx-auto lever">
      <h1 className="font-display text-4xl text-papier mb-8">Nouveau mot de passe</h1>

      {termine ? (
        <>
          <p className="text-sm text-papier/60 leading-relaxed">
            Mot de passe mis à jour. Tu peux retourner lire tranquillement.
          </p>
          <a
            href="/"
            className="inline-block w-full text-center bg-or text-encre font-medium rounded-lg px-3 py-3 hover:brightness-110 transition-all mt-6"
          >
            Retour à Encre
          </a>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {champ({
            type: 'password', required: true, placeholder: 'Nouveau mot de passe',
            value: motDePasse, onChange: (e) => setMotDePasse(e.target.value),
          })}
          {champ({
            type: 'password', required: true, placeholder: 'Confirme le mot de passe',
            value: confirmation, onChange: (e) => setConfirmation(e.target.value),
          })}
          <button
            type="submit"
            className="w-full bg-or text-encre font-medium rounded-lg px-3 py-3 hover:brightness-110 transition-all"
          >
            Valider
          </button>
        </form>
      )}

      {message && <p className="text-sm text-papier/50 mt-4 font-mono">{message}</p>}
    </div>
  )
}
