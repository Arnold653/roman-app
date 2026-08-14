'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'

const MONTANTS_SUGGERES = [100, 250, 500, 1000]

// Le livre est déjà gratuit et le reste — ce bouton ne débloque rien, c'est un pur soutien à
// l'auteur, montant choisi librement par le lecteur.
export default function BoutonPourboire({ livreId }) {
  const [montant, setMontant] = useState(250)
  const [montantPerso, setMontantPerso] = useState('')
  const [statut, setStatut] = useState('repos') // repos | ouverture | verification | merci | erreur
  const [scriptPret, setScriptPret] = useState(false)

  useEffect(() => {
    if (!scriptPret || typeof window === 'undefined') return

    const surSucces = async (reponse) => {
      const transactionId = reponse?.transactionId
      const deblocageId = window.__pourboireEnCours
      if (!transactionId || !deblocageId) return

      setStatut('verification')
      try {
        const res = await fetch('/api/paiement/confirmer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deblocageId, transactionId }),
        })
        if (!res.ok) throw new Error('echec')
        setStatut('merci')
      } catch {
        setStatut('erreur')
      }
    }

    const surEchec = () => setStatut('erreur')

    window.addSuccessListener?.(surSucces)
    window.addFailedListener?.(surEchec)
  }, [scriptPret])

  const montantFinal = montantPerso ? parseInt(montantPerso, 10) : montant

  async function envoyer() {
    if (!montantFinal || montantFinal < 100) {
      setStatut('erreur')
      return
    }
    setStatut('ouverture')
    try {
      const res = await fetch('/api/paiement/creer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ livreId, pourboire: true, montant: montantFinal }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'echec')

      window.__pourboireEnCours = data.deblocageId
      window.openKkiapayWidget?.({
        amount: data.montant,
        key: data.publicKey,
        sandbox: data.sandbox,
        partnerId: data.deblocageId,
        position: 'center',
        theme: '#0079db',
      })
      setStatut('repos')
    } catch {
      setStatut('erreur')
    }
  }

  if (statut === 'merci') {
    return (
      <div className="border border-or/30 rounded-2xl p-8 text-center my-10">
        <p className="text-papier/80">Merci pour ton soutien 🙏</p>
      </div>
    )
  }

  return (
    <div className="border border-ligne rounded-2xl p-8 text-center my-10">
      <Script src="https://cdn.kkiapay.me/k.js" strategy="afterInteractive" onLoad={() => setScriptPret(true)} />
      <p className="font-mono text-xs uppercase tracking-widest text-papier/40 mb-3">Ce livre est gratuit</p>
      <p className="text-papier/60 mb-6">Si vous l'avez aimé, vous pouvez soutenir l'auteur.</p>

      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {MONTANTS_SUGGERES.map((m) => (
          <button
            key={m}
            onClick={() => { setMontant(m); setMontantPerso('') }}
            className={`font-mono text-xs rounded-full px-3 py-2 border transition-colors ${
              !montantPerso && montant === m ? 'border-or text-or' : 'border-papier/15 text-papier/40 hover:border-papier/35'
            }`}
          >
            {m} FCFA
          </button>
        ))}
        <input
          type="number"
          min="100"
          placeholder="Autre"
          value={montantPerso}
          onChange={(e) => setMontantPerso(e.target.value)}
          className="w-24 bg-encreClair border border-ligne rounded-full px-3 py-2 text-papier text-xs text-center focus:outline-none focus:border-or"
        />
      </div>

      <button
        onClick={envoyer}
        disabled={statut === 'ouverture' || statut === 'verification'}
        className="font-mono text-sm uppercase tracking-widest bg-or text-encre rounded-full px-6 py-3 disabled:opacity-50 transition-opacity"
      >
        {statut === 'verification' ? 'Vérification…' : `Envoyer ${montantFinal || 0} FCFA`}
      </button>
      {statut === 'erreur' && (
        <p className="text-grenat text-sm mt-4">Le paiement n'a pas abouti. Réessayez.</p>
      )}
    </div>
  )
}
