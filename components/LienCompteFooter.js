'use client'

import { useEffect, useState } from 'react'

export default function LienCompteFooter() {
  const [statut, setStatut] = useState({ loading: true, pseudo: null })

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((data) => setStatut({ loading: false, pseudo: data.user?.pseudo || null }))
      .catch(() => setStatut({ loading: false, pseudo: null }))
  }, [])

  if (statut.loading) return null

  return statut.pseudo ? (
    <li><a href={`/profil/${statut.pseudo}`} className="hover:text-or transition-colors">Mon profil</a></li>
  ) : (
    <li><a href="/login" className="hover:text-or transition-colors">Se connecter</a></li>
  )
}
