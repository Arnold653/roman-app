'use client'

import { useEffect, useState } from 'react'

export default function ClocheNotifications({ connecte }) {
  const [ouvert, setOuvert] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [nonLues, setNonLues] = useState(0)

  async function charger() {
    const res = await fetch('/api/notifications')
    if (res.ok) {
      const data = await res.json()
      setNotifications(data.notifications)
      setNonLues(data.nonLues)
    }
  }

  useEffect(() => {
    if (!connecte) return
    charger()
    const intervalle = setInterval(charger, 30000)
    return () => clearInterval(intervalle)
  }, [connecte])

  async function ouvrir() {
    setOuvert((o) => !o)
    if (!ouvert && nonLues > 0) {
      await fetch('/api/notifications', { method: 'PATCH' })
      setNonLues(0)
    }
  }

  if (!connecte) return null

  return (
    <div className="relative">
      <button onClick={ouvrir} aria-label="Notifications" className="relative p-1.5 text-papier/70 hover:text-or transition-colors">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M6 8a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 12 6 8Z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9.5 17a2.5 2.5 0 0 0 5 0" strokeLinecap="round" />
        </svg>
        {nonLues > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-or text-encre text-[0.6rem] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {nonLues > 9 ? '9+' : nonLues}
          </span>
        )}
      </button>

      {ouvert && (
        <div className="absolute right-0 mt-3 w-80 max-w-[90vw] bg-encreClair border border-ligne rounded-lg shadow-xl overflow-hidden z-50">
          <p className="text-xs font-mono uppercase tracking-wide text-papier/40 px-4 py-3 border-b border-ligne">
            Notifications
          </p>
          <ul className="max-h-96 overflow-y-auto divide-y divide-ligne">
            {notifications.map((n) => (
              <li key={n.id}>
                <a
                  href={n.lien}
                  onClick={() => setOuvert(false)}
                  className={`block px-4 py-3 text-sm hover:bg-encre/60 transition-colors ${n.lu ? 'text-papier/50' : 'text-papier'}`}
                >
                  {n.contenu}
                  <span className="block text-[0.7rem] text-papier/30 font-mono mt-1">
                    {new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </a>
              </li>
            ))}
            {notifications.length === 0 && (
              <li className="px-4 py-6 text-center text-papier/30 text-sm font-mono">Rien pour l'instant.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
