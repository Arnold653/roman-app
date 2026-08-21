'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pseudo, setPseudo] = useState('')
  const [mode, setMode] = useState('connexion')
  const [message, setMessage] = useState('')

  const supabase = createClient()

  function suite() {
    if (typeof window === 'undefined') return '/'
    return new URLSearchParams(window.location.search).get('suite') || '/'
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')

    if (mode === 'oubli') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
      })
      if (error) setMessage(error.message)
      else setMessage('Un lien de réinitialisation vient de partir sur cette adresse (regarde aussi tes spams).')
      return
    }

    if (mode === 'connexion') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
      else window.location.href = suite()
    } else {
      const pseudoNettoye = pseudo.trim().replace(/\s+/g, ' ')
      if (!pseudoNettoye) { setMessage("Le nom d'utilisateur ne peut pas être vide."); return }
      const parrain = new URLSearchParams(window.location.search).get('ref')
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { pseudo: pseudoNettoye, parraine_par_pseudo: parrain || null } },
      })
      if (error) setMessage(error.message)
      else setMessage('Compte créé. Vérifie ta boîte mail pour confirmer.')
    }
  }

  const champ = (props) => (
    <input
      {...props}
      className="w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier placeholder:text-papier/30 focus:outline-none focus:border-or transition-colors"
    />
  )

  return (
    <div className="px-6 pt-20 pb-24 max-w-sm mx-auto lever">
      <h1 className="font-display text-4xl text-papier mb-8">
        {mode === 'connexion' ? 'Content de te revoir' : mode === 'oubli' ? 'Mot de passe oublié' : 'Rejoindre Encre'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'inscription' &&
          champ({
            type: 'text', required: true, placeholder: "Nom d'utilisateur",
            value: pseudo, onChange: (e) => setPseudo(e.target.value),
          })}
        {champ({
          type: 'email', required: true, placeholder: 'Adresse email',
          value: email, onChange: (e) => setEmail(e.target.value),
        })}
        {mode !== 'oubli' &&
          champ({
            type: 'password', required: true, placeholder: 'Mot de passe',
            value: password, onChange: (e) => setPassword(e.target.value),
          })}
        <button
          type="submit"
          className="w-full bg-or text-encre font-medium rounded-lg px-3 py-3 hover:brightness-110 transition-all"
        >
          {mode === 'connexion' ? 'Se connecter' : mode === 'oubli' ? 'Envoyer le lien' : "S'inscrire"}
        </button>
      </form>

      {message && <p className="text-sm text-papier/50 mt-4 font-mono">{message}</p>}

      {mode === 'connexion' && (
        <button
          onClick={() => { setMode('oubli'); setMessage('') }}
          className="text-sm text-papier/40 hover:text-or mt-3 underline underline-offset-4 transition-colors block"
        >
          Mot de passe oublié ?
        </button>
      )}

      <button
        onClick={() => { setMode(mode === 'connexion' ? 'inscription' : 'connexion'); setMessage('') }}
        className="text-sm text-papier/40 hover:text-or mt-8 underline underline-offset-4 transition-colors"
      >
        {mode === 'connexion' ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
      </button>
    </div>
  )
}
