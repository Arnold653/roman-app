'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'

// Paywall pour un chapitre ou un livre payant. Affiche le prix + un bouton qui ouvre le widget
// KKiaPay ; au succès, confirme côté serveur puis rafraîchit la page pour révéler le contenu
// (le contenu verrouillé n'est de toute façon jamais envoyé au navigateur avant déblocage).
export default function BoutonDeblocage({ chapitreId, livreId, romanId, prixFcfa, publieLe, libelle }) {
  const router = useRouter()
  const [statut, setStatut] = useState('repos') // repos | ouverture | verification | erreur
  const [scriptPret, setScriptPret] = useState(false)

  useEffect(() => {
    if (!scriptPret || typeof window === 'undefined') return

    const surSucces = async (reponse) => {
      const transactionId = reponse?.transactionId
      const deblocageId = window.__deblocageEnCours
      if (!transactionId || !deblocageId) return

      setStatut('verification')
      try {
        const res = await fetch('/api/paiement/confirmer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deblocageId, transactionId }),
        })
        if (!res.ok) throw new Error('echec')
        router.refresh()
        setStatut('repos')
      } catch {
        setStatut('erreur')
      }
    }

    const surEchec = () => setStatut('erreur')

    window.addSuccessListener?.(surSucces)
    window.addFailedListener?.(surEchec)
  }, [scriptPret, router])

  async function payer() {
    setStatut('ouverture')
    try {
      const res = await fetch('/api/paiement/creer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapitreId, livreId, romanId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'echec')

      window.__deblocageEnCours = data.deblocageId
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

  return (
    <div className="border border-ligne rounded-2xl p-8 text-center my-10">
      <Script src="https://cdn.kkiapay.me/k.js" strategy="afterInteractive" onLoad={() => setScriptPret(true)} />
      <p className="font-mono text-xs uppercase tracking-widest text-papier/40 mb-3">Contenu verrouillé</p>
      <p className="text-papier/60 mb-2">
        {publieLe
          ? `Débloquez ${libelle || (chapitreId ? 'ce chapitre' : romanId ? 'ce roman' : 'ce livre')} en avant-première pour continuer la lecture.`
          : `Débloquez ${libelle || (chapitreId ? 'ce chapitre' : romanId ? 'ce roman' : 'ce livre')} pour y accéder.`}
      </p>
      {publieLe && (
        <p className="text-papier/35 text-xs mb-6">
          Ou attendez — il devient gratuit pour tous le{' '}
          {new Date(publieLe).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}.
        </p>
      )}
      <button
        onClick={payer}
        disabled={statut === 'ouverture' || statut === 'verification'}
        className="font-mono text-sm uppercase tracking-widest bg-or text-encre rounded-full px-6 py-3 disabled:opacity-50 transition-opacity"
      >
        {statut === 'verification' ? 'Vérification…' : `Débloquer — ${prixFcfa.toLocaleString('fr-FR')} FCFA`}
      </button>
      {statut === 'erreur' && (
        <p className="text-grenat text-sm mt-4">Le paiement n'a pas abouti. Réessayez.</p>
      )}
    </div>
  )
}
