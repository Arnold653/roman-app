'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pseudo, setPseudo] = useState('')
  const [mode, setMode] = useState('connexion') // 'connexion' | 'inscription'
  const [message, setMessage] = useState('')

  const supabase = createClient()

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')

    if (mode === 'connexion') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
      else window.location.href = '/'
    } else {
      // le pseudo est stocké dans les métadonnées utilisateur ; un trigger
      // côté base de données crée automatiquement le profil avec ce pseudo
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { pseudo } },
      })
      if (error) setMessage(error.message)
      else setMessage('Compte créé. Vérifie ta boîte mail pour confirmer.')
    }
  }

  return (
    <div className="px-6 py-16 max-w-sm mx-auto">
      <h1 className="font-display text-3xl text-papier mb-6">
        {mode === 'connexion' ? 'Se connecter' : 'Créer un compte'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'inscription' && (
          <input
            type="text"
            required
            placeholder="Nom d'utilisateur"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-papier placeholder:text-papier/30 focus:outline-none focus:border-braise"
          />
        )}
        <input
          type="email"
          required
          placeholder="Adresse email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-papier placeholder:text-papier/30 focus:outline-none focus:border-braise"
        />
        <input
          type="password"
          required
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-papier placeholder:text-papier/30 focus:outline-none focus:border-braise"
        />
        <button
          type="submit"
          className="w-full bg-braise text-encre font-medium rounded px-3 py-2 hover:opacity-90 transition-opacity"
        >
          {mode === 'connexion' ? 'Se connecter' : "S'inscrire"}
        </button>
      </form>

      {message && <p className="text-sm text-papier/60 mt-4">{message}</p>}

      <button
        onClick={() => setMode(mode === 'connexion' ? 'inscription' : 'connexion')}
        className="text-sm text-papier/50 hover:text-braise mt-6 underline"
      >
        {mode === 'connexion' ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
      </button>
    </div>
  )
}
