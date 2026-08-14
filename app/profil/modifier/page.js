'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ModifierProfilPage() {
  const [profil, setProfil] = useState(null)
  const [bio, setBio] = useState('')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [message, setMessage] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function charger() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfil(data)
      setBio(data?.bio || '')
    }
    charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function choisirPhoto(e) {
    const fichier = e.target.files?.[0]
    if (!fichier || !profil) return

    setEnvoiEnCours(true)
    setMessage('')
    setPreviewUrl(URL.createObjectURL(fichier))

    const extension = fichier.name.split('.').pop()
    const chemin = `${profil.id}/avatar.${extension}`

    const { error: erreurUpload } = await supabase.storage
      .from('avatars')
      .upload(chemin, fichier, { upsert: true })

    if (erreurUpload) {
      setMessage(`Erreur : ${erreurUpload.message}`)
      setEnvoiEnCours(false)
      return
    }

    const { data: urlPublique } = supabase.storage.from('avatars').getPublicUrl(chemin)
    // on ajoute un paramètre pour forcer le rafraîchissement du cache image
    const urlAvecCacheBust = `${urlPublique.publicUrl}?t=${Date.now()}`

    const { error: erreurMaj } = await supabase
      .from('profiles')
      .update({ avatar_url: urlAvecCacheBust })
      .eq('id', profil.id)

    setEnvoiEnCours(false)
    if (erreurMaj) {
      setMessage(`Erreur : ${erreurMaj.message}`)
    } else {
      setProfil((p) => ({ ...p, avatar_url: urlAvecCacheBust }))
      setMessage('Photo mise à jour ✓')
    }
  }

  async function enregistrerBio(e) {
    e.preventDefault()
    setEnvoiEnCours(true)
    setMessage('')

    const { error } = await supabase.from('profiles').update({ bio }).eq('id', profil.id)

    setEnvoiEnCours(false)
    setMessage(error ? `Erreur : ${error.message}` : 'Bio enregistrée ✓')
  }

  if (!profil) {
    return <div className="px-6 py-24 text-center text-papier/35 font-mono text-sm">Chargement...</div>
  }

  const avatarAffiche = previewUrl || profil.avatar_url

  return (
    <div className="px-6 pt-16 pb-24 max-w-md mx-auto lever">
      <h1 className="font-display text-4xl text-papier mb-10">Modifier mon profil</h1>

      <div className="flex flex-col items-center mb-10">
        <div className="relative">
          {avatarAffiche ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarAffiche} alt={profil.pseudo} className="w-24 h-24 rounded-full object-cover" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-or to-[#0a1a2e] flex items-center justify-center">
              <span className="font-display text-4xl text-papier">{profil.pseudo?.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <label className="absolute bottom-0 right-0 bg-or text-encre rounded-full w-8 h-8 flex items-center justify-center cursor-pointer shadow-lg">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            <input type="file" accept="image/*" onChange={choisirPhoto} className="hidden" disabled={envoiEnCours} />
          </label>
        </div>
        <p className="font-display text-xl text-papier mt-4">{profil.pseudo}</p>
      </div>

      <form onSubmit={enregistrerBio} className="space-y-3">
        <label className="text-xs font-mono uppercase tracking-wide text-papier/40 block">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          placeholder="Quelques mots sur toi et tes lectures..."
          className="w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier text-sm leading-relaxed focus:outline-none focus:border-or transition-colors"
        />
        <button
          type="submit"
          disabled={envoiEnCours}
          className="w-full bg-or text-encre font-medium rounded-lg px-3 py-3 hover:brightness-110 transition-all disabled:opacity-50"
        >
          Enregistrer
        </button>
      </form>

      {message && <p className="text-sm text-papier/60 mt-4 font-mono">{message}</p>}

      <a href={`/profil/${profil.pseudo}`} className="block text-center text-papier/40 text-sm mt-8 hover:text-or transition-colors">
        ← Retour à mon profil
      </a>
    </div>
  )
}
