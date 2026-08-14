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
    const res = await fetch('/api/admin/conte-africain/image', {
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

export default function AdminContesAfricainsPage() {
  const [contes, setContes] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [progression, setProgression] = useState(null)
  const [form, setForm] = useState({
    titre: '', slug: '', auteur: '', description: '', genre: '', region: '', verifie_par: '', genere_par_ia: true,
  })
  const [fichier, setFichier] = useState(null)
  const [apercu, setApercu] = useState(null)
  const [contesPlies, setContesPlies] = useState(new Set())

  function basculerPliConte(id) {
    setContesPlies((s) => {
      const suivant = new Set(s)
      if (suivant.has(id)) suivant.delete(id)
      else suivant.add(id)
      return suivant
    })
  }

  useEffect(() => { charger() }, [])

  async function charger() {
    const res = await fetch('/api/admin/conte-africain')
    if (res.ok) setContes((await res.json()).contes)
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

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
      setMessage(`Extraction terminée : ${contenu.sections.length} section(s) détectée(s). Vérifie l'aperçu ci-dessous avant de créer le conte.`)
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

    const res = await fetch('/api/admin/conte-africain', { method: 'POST', body: data })
    const resultat = await res.json()
    setLoading(false)

    if (!res.ok) {
      setMessage(`Erreur : ${resultat.error}`)
    } else {
      setMessage(`${statutFinal === 'publie' ? 'Publié' : 'Enregistré en brouillon'} ✓ — /contes-africains/${resultat.slug}`)
      setForm({ titre: '', slug: '', auteur: '', description: '', genre: '', region: '', verifie_par: '', genere_par_ia: true })
      setFichier(null)
      setApercu(null)
      charger()
    }
  }

  async function supprimer(conte) {
    if (!confirm(`Supprimer "${conte.titre}" ?`)) return
    const res = await fetch(`/api/admin/conte-africain?id=${conte.id}`, { method: 'DELETE' })
    if (res.ok) { setMessage('Supprimé.'); charger() }
  }

  async function viderCache(conte) {
    const res = await fetch('/api/admin/conte-africain', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'vider_cache', id: conte.id }),
    })
    if (res.ok) { setMessage('Cache vidé — le texte sera ré-extrait à la prochaine ouverture.'); charger() }
  }

  async function basculerStatut(conte) {
    const nouveauStatut = conte.statut === 'publie' ? 'brouillon' : 'publie'
    const res = await fetch('/api/admin/conte-africain', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'statut', id: conte.id, statut: nouveauStatut }),
    })
    if (res.ok) charger()
  }

  const champ = (label, field, type = 'text') => (
    <div>
      <label className="text-xs font-mono uppercase tracking-wide text-papier/40 block mb-2">{label}</label>
      {type === 'textarea' ? (
        <textarea value={form[field]} onChange={(e) => update(field, e.target.value)} rows={4}
          className="w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier text-sm leading-relaxed focus:outline-none focus:border-[#e69742] transition-colors" />
      ) : (
        <input type={type} value={form[field]} onChange={(e) => update(field, e.target.value)}
          className="w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier text-sm focus:outline-none focus:border-[#e69742] transition-colors" />
      )}
    </div>
  )

  return (
    <div className="px-6 pt-16 pb-24 max-w-xl mx-auto lever">
      <p className="text-[#e69742] text-xs font-mono uppercase tracking-[0.2em] mb-3">Encre — Admin</p>
      <h1 className="font-display text-4xl text-papier mb-2">Publier un conte africain</h1>
      <p className="text-papier/45 text-sm mb-10 leading-relaxed">
        Un conte ou une histoire traditionnelle, livré en un seul fichier (PDF, Markdown ou texte).
        <br /><a href="/admin" className="text-[#e69742] hover:brightness-125">← Retour à l'admin des romans</a>
      </p>

      <div className="space-y-6">
        {champ('Titre du conte', 'titre')}
        {champ('Slug (identifiant dans l\'URL)', 'slug')}
        {champ('Auteur / conteur (optionnel)', 'auteur')}
        {champ('Description / résumé', 'description', 'textarea')}
        {champ('Genre (optionnel)', 'genre')}
        {champ('Région / origine (ex. Bénin, Sénégal, Mali...)', 'region')}

        <div>
          <label className="text-xs font-mono uppercase tracking-wide text-papier/40 block mb-2">
            Fichier (PDF, .md ou .txt)
          </label>
          <input
            type="file" accept=".pdf,.md,.txt,.epub,.docx,application/pdf,text/markdown,text/plain,application/epub+zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => { setFichier(e.target.files?.[0] || null); setApercu(null) }}
            className="w-full text-papier text-sm"
          />
        </div>

        <div className="border-t border-ligne pt-5">
          <p className="text-[#e69742] text-xs font-mono uppercase tracking-widest mb-4">Transparence</p>
          <label className="flex items-center gap-2 text-sm text-papier/70 mb-4">
            <input type="checkbox" checked={form.genere_par_ia} onChange={(e) => update('genere_par_ia', e.target.checked)} />
            Contenu généré avec l'aide de l'IA
          </label>
          {champ('Vérifié par (nom, optionnel)', 'verifie_par')}
        </div>

        {!apercu ? (
          <button
            type="button" onClick={extraireEtApercevoir} disabled={loading || !fichier}
            className="w-full bg-encreClair border border-[#e69742]/40 text-[#e69742] font-medium rounded-lg px-3 py-3.5 hover:bg-[#e69742]/10 transition-all disabled:opacity-50"
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
                className="flex-1 bg-[#e69742] text-encre text-sm font-medium rounded-lg px-3 py-3 hover:brightness-110 transition-all disabled:opacity-50">
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

      <p className="text-[#e69742] text-xs font-mono uppercase tracking-widest mb-6">Contes africains</p>
      <div className="space-y-2">
        {contes?.map((c) => {
          const plie = !contesPlies.has(c.id)
          const sections = c.contenu_extrait?.sections || []
          return (
          <div key={c.id} className="bg-encreClair rounded-md px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <button
                onClick={() => basculerPliConte(c.id)}
                className="flex items-center gap-2 text-left min-w-0"
                disabled={sections.length === 0}
              >
                {sections.length > 0 && (
                  <span className={`text-papier/30 text-xs transition-transform shrink-0 ${plie ? '-rotate-90' : ''}`}>▼</span>
                )}
                <span className="text-sm text-papier/70 truncate">{c.titre}</span>
                {c.region && <span className="text-[0.65rem] font-mono text-papier/35 shrink-0">· {c.region}</span>}
              </button>
              <button
                onClick={() => basculerStatut(c)}
                className={`text-[0.65rem] font-mono uppercase tracking-wide rounded-full px-2.5 py-1 border shrink-0 ${
                  c.statut === 'publie' ? 'border-[#e69742]/40 text-[#e69742]' : 'border-papier/20 text-papier/40'
                }`}
              >
                {c.statut === 'publie' ? 'Publié' : 'Brouillon'}
              </button>
            </div>

            {!plie && sections.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
                {sections.map((s, i) => (
                  <span key={i} className="font-mono text-[0.65rem] text-papier/50 border border-ligne rounded-full px-2 py-1">{s.pilLabel}</span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 mt-2">
              <a
                href={`/contes-africains/${c.slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono uppercase text-papier/40 hover:text-[#e69742] transition-colors"
              >
                Aperçu ↗
              </a>
              <button
                onClick={() => viderCache(c)}
                disabled={!c.contenu_extrait}
                className="text-xs font-mono uppercase text-papier/40 hover:text-[#e69742] transition-colors disabled:opacity-40 disabled:hover:text-papier/40"
              >
                {c.contenu_extrait ? 'Vider le cache' : 'Pas encore extrait'}
              </button>
              <button onClick={() => supprimer(c)} className="text-xs font-mono uppercase text-papier/40 hover:text-grenat transition-colors">Suppr.</button>
            </div>
          </div>
          )
        })}
        {contes?.length === 0 && <p className="text-papier/30 text-xs font-mono">Aucun conte pour le moment.</p>}
      </div>
    </div>
  )
}
