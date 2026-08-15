'use client'

import { useEffect, useState } from 'react'
import { extrairePdfDepuisUrl } from '@/lib/extractionPdf'
import { extraireTexteBrut } from '@/lib/extractionTexte'
import { extraireDocx } from '@/lib/extractionDocx'
import { extraireEpub } from '@/lib/extractionEpub'

function detecterType(nomFichier) {
  const ext = nomFichier.split('.').pop().toLowerCase()
  if (ext === 'md') return 'md'
  if (ext === 'txt') return 'txt'
  if (ext === 'epub') return 'epub'
  if (ext === 'docx') return 'docx'
  return 'pdf'
}

async function televerserImageAdmin(slug, nom, dataUrl) {
  try {
    const res = await fetch('/api/admin/livre/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, nom, dataUrl }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.url || null
  } catch {
    return null
  }
}

export default function AdminLivresPage() {
  const [livres, setLivres] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [progression, setProgression] = useState(null)
  const [form, setForm] = useState({
    titre: '', slug: '', auteur: '', description: '', genre: '', verifie_par: '', genere_par_ia: true,
  })
  const [fichier, setFichier] = useState(null)
  const [apercu, setApercu] = useState(null) // { contenu, sections } prêt à être envoyé
  const [livresPlies, setLivresPlies] = useState(new Set())
  const [edition, setEdition] = useState(null) // id du livre en cours d'édition des infos (métadonnées seules)
  const [monetisation, setMonetisation] = useState({}) // { [livreId]: { mode_monetisation, prix_fcfa, bonus_contenu } }
  const [monetisationOuverte, setMonetisationOuverte] = useState(null) // id du livre en cours d'édition

  function editer(livre) {
    setEdition(livre.id)
    setApercu(null)
    setFichier(null)
    setForm({
      titre: livre.titre, slug: livre.slug, auteur: livre.auteur || '', description: livre.description || '',
      genre: livre.genre || '', verifie_par: livre.verifie_par || '', genere_par_ia: livre.genere_par_ia ?? true,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function annulerEdition() {
    setEdition(null)
    setForm({ titre: '', slug: '', auteur: '', description: '', genre: '', verifie_par: '', genere_par_ia: true })
    setMessage('')
  }

  async function enregistrerMetadonnees() {
    setLoading(true)
    setMessage('')
    const res = await fetch('/api/admin/livre', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'metadonnees', id: edition, ...form }),
    })
    const resultat = await res.json()
    setLoading(false)
    if (!res.ok) {
      setMessage(`Erreur : ${resultat.error}`)
    } else {
      setMessage('Modifications enregistrées ✓')
      annulerEdition()
      charger()
    }
  }

  function ouvrirMonetisation(livre) {
    setMonetisationOuverte(livre.id)
    setMonetisation((m) => ({
      ...m,
      [livre.id]: {
        mode_monetisation: livre.mode_monetisation || 'gratuit',
        prix_fcfa: livre.prix_fcfa || 0,
        bonus_contenu: livre.bonus_contenu || '',
      },
    }))
  }

  function majMonetisation(livreId, champ, valeur) {
    setMonetisation((m) => ({ ...m, [livreId]: { ...m[livreId], [champ]: valeur } }))
  }

  async function sauvegarderMonetisation(livreId) {
    const donnees = monetisation[livreId]
    const res = await fetch('/api/admin/livre', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'monetisation', id: livreId, ...donnees }),
    })
    if (res.ok) { setMessage('Monétisation enregistrée ✓'); setMonetisationOuverte(null); charger() }
    else setMessage('Erreur lors de l\'enregistrement de la monétisation')
  }

  function basculerPliLivre(id) {
    setLivresPlies((s) => {
      const suivant = new Set(s)
      if (suivant.has(id)) suivant.delete(id)
      else suivant.add(id)
      return suivant
    })
  }

  useEffect(() => { charger() }, [])

  async function charger() {
    const res = await fetch('/api/admin/livre')
    if (res.ok) setLivres((await res.json()).livres)
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  // Extrait le fichier côté admin (une seule fois, à l'upload) au lieu de laisser le premier
  // lecteur public attendre l'extraction — but même de cette évolution.
  async function extraireEtApercevoir() {
    if (!fichier) { setMessage('Choisis un fichier.'); return }
    if (!form.slug) { setMessage('Renseigne le slug avant d\'extraire (utilisé pour stocker les images).'); return }
    setLoading(true)
    setMessage('')
    setProgression(0)

    try {
      const type = detecterType(fichier.name)
      let contenu
      if (type === 'pdf') {
        const bytes = new Uint8Array(await fichier.arrayBuffer())
        contenu = await extrairePdfDepuisUrl(
          bytes,
          (nom, dataUrl) => televerserImageAdmin(form.slug, nom, dataUrl),
          (p) => setProgression(p)
        )
      } else if (type === 'epub') {
        const bytes = await fichier.arrayBuffer()
        contenu = await extraireEpub(bytes, (p) => setProgression(p))
      } else if (type === 'docx') {
        const bytes = await fichier.arrayBuffer()
        contenu = await extraireDocx(bytes)
      } else {
        const texte = await fichier.text()
        contenu = extraireTexteBrut(texte)
      }
      setApercu({ contenu, type })
      setMessage(`Extraction terminée : ${contenu.sections.length} section(s) détectée(s). Vérifie l'aperçu ci-dessous avant de créer le livre.`)
    } catch (e) {
      setMessage(`Erreur d'extraction : ${e?.message || e}`)
    } finally {
      setLoading(false)
      setProgression(null)
    }
  }

  async function envoyer(statutFinal) {
    if (!fichier || !apercu) { setMessage('Extrais le fichier d\'abord.'); return }
    setLoading(true)
    setMessage('')

    const data = new FormData()
    Object.entries(form).forEach(([k, v]) => data.append(k, v))
    data.append('fichier', fichier)
    data.append('fichier_type', apercu.type)
    data.append('contenu_extrait', JSON.stringify(apercu.contenu))
    data.append('statut', statutFinal)

    const res = await fetch('/api/admin/livre', { method: 'POST', body: data })
    const resultat = await res.json()
    setLoading(false)

    if (!res.ok) {
      setMessage(`Erreur : ${resultat.error}`)
    } else {
      setMessage(`${statutFinal === 'publie' ? 'Publié' : 'Enregistré en brouillon'} ✓ — /livres/${resultat.slug}`)
      setForm({ titre: '', slug: '', auteur: '', description: '', genre: '', verifie_par: '', genere_par_ia: true })
      setFichier(null)
      setApercu(null)
      charger()
    }
  }

  async function supprimer(livre) {
    if (!confirm(`Supprimer "${livre.titre}" ?`)) return
    const res = await fetch(`/api/admin/livre?id=${livre.id}`, { method: 'DELETE' })
    if (res.ok) { setMessage('Supprimé.'); charger() }
  }

  async function viderCache(livre) {
    const res = await fetch('/api/admin/livre', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'vider_cache', id: livre.id }),
    })
    if (res.ok) { setMessage('Cache vidé — le texte sera ré-extrait à la prochaine ouverture.'); charger() }
  }

  async function basculerStatut(livre) {
    const nouveauStatut = livre.statut === 'publie' ? 'brouillon' : 'publie'
    const res = await fetch('/api/admin/livre', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'statut', id: livre.id, statut: nouveauStatut }),
    })
    if (res.ok) charger()
  }

  const champ = (label, field, type = 'text', readOnly = false) => (
    <div>
      <label className="text-xs font-mono uppercase tracking-wide text-papier/40 block mb-2">{label}</label>
      {type === 'textarea' ? (
        <textarea value={form[field]} onChange={(e) => update(field, e.target.value)} rows={4} readOnly={readOnly}
          className={`w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier text-sm leading-relaxed focus:outline-none focus:border-or transition-colors ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`} />
      ) : (
        <input type={type} value={form[field]} onChange={(e) => update(field, e.target.value)} readOnly={readOnly}
          className={`w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier text-sm focus:outline-none focus:border-or transition-colors ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`} />
      )}
    </div>
  )

  return (
    <div className="px-6 pt-16 pb-24 max-w-xl mx-auto lever">
      <p className="text-or text-xs font-mono uppercase tracking-[0.2em] mb-3">Encre — Admin</p>
      <h1 className="font-display text-4xl text-papier mb-2">{edition ? 'Modifier les infos du livre' : 'Publier un livre'}</h1>
      <p className="text-papier/45 text-sm mb-10 leading-relaxed">
        {edition
          ? "Le fichier et le texte ne changent pas ici — seules les informations. Pour le texte, utilise \"Modifier le texte\" depuis la liste."
          : 'Un ouvrage complet livré en un seul fichier (PDF, Markdown ou texte) — distinct des romans publiés chapitre par chapitre.'}
        <br /><a href="/admin" className="text-or hover:brightness-125">← Retour à l'admin des romans</a>
      </p>

      <div className="space-y-6">
        {champ('Titre du livre', 'titre')}
        {champ('Slug (identifiant dans l\'URL)', 'slug', 'text', !!edition)}
        {champ('Auteur (optionnel)', 'auteur')}
        {champ('Description / résumé', 'description', 'textarea')}
        {champ('Genre', 'genre')}

        {!edition && (
        <div>
          <label className="text-xs font-mono uppercase tracking-wide text-papier/40 block mb-2">
            Fichier (PDF, .md ou .txt)
          </label>
          <input
            type="file" accept=".pdf,.md,.txt,.epub,.docx,application/pdf,text/markdown,text/plain,application/epub+zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => { setFichier(e.target.files?.[0] || null); setApercu(null) }}
            className="w-full text-papier text-sm"
          />
          <p className="text-papier/30 text-xs font-mono mt-2">L'EPUB n'est pas encore pris en charge.</p>
        </div>
        )}

        <div className="border-t border-ligne pt-5">
          <p className="text-or text-xs font-mono uppercase tracking-widest mb-4">Transparence</p>
          <label className="flex items-center gap-2 text-sm text-papier/70 mb-4">
            <input type="checkbox" checked={form.genere_par_ia} onChange={(e) => update('genere_par_ia', e.target.checked)} />
            Contenu généré avec l'aide de l'IA
          </label>
          {champ('Vérifié par (nom, optionnel)', 'verifie_par')}
        </div>

        {edition ? (
          <div className="flex gap-3">
            <button type="button" onClick={annulerEdition} disabled={loading}
              className="flex-1 bg-encre border border-ligne text-papier/70 text-sm rounded-lg px-3 py-3 hover:border-papier/30 transition-colors disabled:opacity-50">
              Annuler
            </button>
            <button type="button" onClick={enregistrerMetadonnees} disabled={loading}
              className="flex-1 bg-or text-encre text-sm font-medium rounded-lg px-3 py-3 hover:brightness-110 transition-all disabled:opacity-50">
              {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        ) : !apercu ? (
          <button
            type="button" onClick={extraireEtApercevoir} disabled={loading || !fichier}
            className="w-full bg-encreClair border border-or/40 text-or font-medium rounded-lg px-3 py-3.5 hover:bg-or/10 transition-all disabled:opacity-50"
          >
            {loading ? `Extraction en cours${progression !== null ? ` (${progression}%)` : '...'}` : 'Extraire le texte'}
          </button>
        ) : (
          <div className="border border-ligne rounded-lg p-4 bg-encreClair">
            <p className="text-papier/70 text-sm mb-3">Aperçu des sections détectées :</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {apercu.contenu.sections.map((s, i) => (
                <span key={i} className="font-mono text-[0.65rem] text-papier/50 border border-ligne rounded-full px-2 py-1">{s.pilLabel}</span>
              ))}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => envoyer('brouillon')} disabled={loading}
                className="flex-1 bg-encre border border-ligne text-papier/70 text-sm rounded-lg px-3 py-3 hover:border-papier/30 transition-colors disabled:opacity-50">
                Enregistrer en brouillon
              </button>
              <button type="button" onClick={() => envoyer('publie')} disabled={loading}
                className="flex-1 bg-or text-encre text-sm font-medium rounded-lg px-3 py-3 hover:brightness-110 transition-all disabled:opacity-50">
                Publier directement
              </button>
            </div>
            <button type="button" onClick={() => setApercu(null)} className="text-papier/30 text-xs font-mono mt-3 hover:text-papier/50">
              ← Recommencer l'extraction
            </button>
          </div>
        )}
      </div>

      {message && <p className="text-sm text-papier/60 mt-4 font-mono">{message}</p>}

      <div className="filet-or my-14" />

      <p className="text-or text-xs font-mono uppercase tracking-widest mb-6">Livres</p>
      <div className="space-y-2">
        {livres?.map((l) => {
          const plie = !livresPlies.has(l.id) // déplié par défaut, comme avant
          const sections = l.contenu_extrait?.sections || []
          return (
          <div key={l.id} className="bg-encreClair rounded-md px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <button
                onClick={() => basculerPliLivre(l.id)}
                className="flex items-center gap-2 text-left min-w-0"
                disabled={sections.length === 0}
              >
                {sections.length > 0 && (
                  <span className={`text-papier/30 text-xs transition-transform shrink-0 ${plie ? '-rotate-90' : ''}`}>▼</span>
                )}
                <span className="text-sm text-papier/70 truncate">{l.titre}</span>
              </button>
              <button
                onClick={() => basculerStatut(l)}
                className={`text-[0.65rem] font-mono uppercase tracking-wide rounded-full px-2.5 py-1 border shrink-0 ${
                  l.statut === 'publie' ? 'border-or/40 text-or' : 'border-papier/20 text-papier/40'
                }`}
              >
                {l.statut === 'publie' ? 'Publié' : 'Brouillon'}
              </button>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-[0.65rem] font-mono uppercase tracking-wide text-papier/40 border border-ligne rounded-full px-2.5 py-1">
                {{ gratuit: 'Gratuit', pourboire: 'Gratuit + pourboire', payant: 'Payant', bonus: 'Gratuit + bonus payant' }[l.mode_monetisation || 'gratuit']}
                {l.prix_fcfa > 0 && (l.mode_monetisation === 'payant' || l.mode_monetisation === 'bonus') ? ` · ${l.prix_fcfa} FCFA` : ''}
              </span>
              <button
                onClick={() => (monetisationOuverte === l.id ? setMonetisationOuverte(null) : ouvrirMonetisation(l))}
                className="text-[0.65rem] font-mono text-or hover:brightness-125"
              >
                {monetisationOuverte === l.id ? 'Fermer' : 'Modifier'}
              </button>
            </div>

            {monetisationOuverte === l.id && (
              <div className="bg-encre border border-ligne rounded-lg p-4 mb-3 space-y-3">
                <div>
                  <label className="text-xs font-mono uppercase tracking-wide text-papier/40 block mb-2">Mode de monétisation</label>
                  <select
                    value={monetisation[l.id]?.mode_monetisation}
                    onChange={(e) => majMonetisation(l.id, 'mode_monetisation', e.target.value)}
                    className="w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier text-sm focus:outline-none focus:border-or"
                  >
                    <option value="gratuit">Gratuit</option>
                    <option value="pourboire">Gratuit + pourboire libre</option>
                    <option value="payant">Entièrement payant</option>
                    <option value="bonus">Gratuit + bonus payant à côté</option>
                  </select>
                </div>
                {(monetisation[l.id]?.mode_monetisation === 'payant' || monetisation[l.id]?.mode_monetisation === 'bonus') && (
                  <div>
                    <label className="text-xs font-mono uppercase tracking-wide text-papier/40 block mb-2">
                      Prix en FCFA {monetisation[l.id]?.mode_monetisation === 'bonus' ? '(du bonus)' : '(du livre entier)'}
                    </label>
                    <input
                      type="number" min="0" step="50"
                      value={monetisation[l.id]?.prix_fcfa}
                      onChange={(e) => majMonetisation(l.id, 'prix_fcfa', e.target.value)}
                      className="w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier text-sm focus:outline-none focus:border-or"
                    />
                  </div>
                )}
                {monetisation[l.id]?.mode_monetisation === 'bonus' && (
                  <div>
                    <label className="text-xs font-mono uppercase tracking-wide text-papier/40 block mb-2">Texte du bonus (postface, notes, chapitre inédit...)</label>
                    <textarea
                      rows={4}
                      value={monetisation[l.id]?.bonus_contenu}
                      onChange={(e) => majMonetisation(l.id, 'bonus_contenu', e.target.value)}
                      className="w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier text-sm leading-relaxed focus:outline-none focus:border-or"
                    />
                  </div>
                )}
                <button
                  onClick={() => sauvegarderMonetisation(l.id)}
                  className="w-full bg-or text-encre text-sm font-medium rounded-lg px-3 py-2.5 hover:brightness-110 transition-all"
                >
                  Enregistrer
                </button>
              </div>
            )}

            {!plie && sections.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
                {sections.map((s, i) => (
                  <span key={i} className="font-mono text-[0.65rem] text-papier/50 border border-ligne rounded-full px-2 py-1">{s.pilLabel}</span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 mt-2">
              <a
                href={`/livres/${l.slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono uppercase text-papier/40 hover:text-or transition-colors"
              >
                Aperçu ↗
              </a>
              <a href={`/admin/livres/${l.id}/modifier`} className="text-xs font-mono uppercase text-papier/40 hover:text-or transition-colors">Modifier le texte</a>
              <button onClick={() => editer(l)} className="text-xs font-mono uppercase text-papier/40 hover:text-or transition-colors">Modifier les infos</button>
              <button
                onClick={() => viderCache(l)}
                disabled={!l.contenu_extrait}
                className="text-xs font-mono uppercase text-papier/40 hover:text-or transition-colors disabled:opacity-40 disabled:hover:text-papier/40"
              >
                {l.contenu_extrait ? 'Vider le cache' : 'Pas encore extrait'}
              </button>
              <button onClick={() => supprimer(l)} className="text-xs font-mono uppercase text-papier/40 hover:text-grenat transition-colors">Suppr.</button>
            </div>
          </div>
          )
        })}
        {livres?.length === 0 && <p className="text-papier/30 text-xs font-mono">Aucun livre pour le moment.</p>}
      </div>
    </div>
  )
}
