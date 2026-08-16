'use client'

import { useEffect, useState } from 'react'
import { extrairePdfDepuisUrl } from '@/lib/extractionPdf'
import { extraireTexteBrut } from '@/lib/extractionTexte'
import { extraireDocx } from '@/lib/extractionDocx'
import { extraireEpub } from '@/lib/extractionEpub'
import { detecterTitreLivre, slugDepuisTitre, slugUnique } from '@/lib/detectionTitre'
import { extraireEnTeteMetadonnees } from '@/lib/parseEnTete'
import { GENRES_CONTES_AFRICAINS } from '@/lib/genres'

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
  const [edition, setEdition] = useState(null) // id du conte en cours d'édition des infos
  const [monetisation, setMonetisation] = useState({}) // { [conteId]: { mode_monetisation, prix_fcfa, bonus_contenu } }
  const [monetisationOuverte, setMonetisationOuverte] = useState(null)

  // --- Upload multiple ---
  const [fichiersLot, setFichiersLot] = useState([])
  const [genreLot, setGenreLot] = useState('')
  const [regionLot, setRegionLot] = useState('')
  const [lotEnCours, setLotEnCours] = useState(false)
  const [lotProgression, setLotProgression] = useState(null)
  const [lotResultats, setLotResultats] = useState(null)

  function editer(conte) {
    setEdition(conte.id)
    setApercu(null)
    setFichier(null)
    setForm({
      titre: conte.titre, slug: conte.slug, auteur: conte.auteur || '', description: conte.description || '',
      genre: conte.genre || '', region: conte.region || '', verifie_par: conte.verifie_par || '', genere_par_ia: conte.genere_par_ia ?? true,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function annulerEdition() {
    setEdition(null)
    setForm({ titre: '', slug: '', auteur: '', description: '', genre: '', region: '', verifie_par: '', genere_par_ia: true })
    setMessage('')
  }

  async function enregistrerMetadonnees() {
    setLoading(true)
    setMessage('')
    const res = await fetch('/api/admin/conte-africain', {
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

  function ouvrirMonetisation(conte) {
    setMonetisationOuverte(conte.id)
    setMonetisation((m) => ({
      ...m,
      [conte.id]: {
        mode_monetisation: conte.mode_monetisation || 'gratuit',
        prix_fcfa: conte.prix_fcfa || 0,
        bonus_contenu: conte.bonus_contenu || '',
      },
    }))
  }

  function majMonetisation(conteId, champ, valeur) {
    setMonetisation((m) => ({ ...m, [conteId]: { ...m[conteId], [champ]: valeur } }))
  }

  async function sauvegarderMonetisation(conteId) {
    const donnees = monetisation[conteId]
    const res = await fetch('/api/admin/conte-africain', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'monetisation', id: conteId, ...donnees }),
    })
    if (res.ok) { setMessage('Monétisation enregistrée ✓'); setMonetisationOuverte(null); charger() }
    else setMessage('Erreur lors de l\'enregistrement de la monétisation')
  }

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
    const type = detecterType(fichier.name)
    if (type === 'pdf' && !form.slug) { setMessage('Renseigne le slug avant d\'extraire (utilisé pour stocker les images).'); return }
    setLoading(true)
    setMessage('')
    setProgression(0)

    try {
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
        // .md / .txt : en-tête de métadonnées optionnel (titre, genre, région, résumé) produit
        // par le prompt CONTE AFRICAIN ENGINE — détecté et retiré avant segmentation, pour ne
        // pas dupliquer le titre comme section et pré-remplir le formulaire automatiquement.
        const brut = await fichier.text()
        const entete = extraireEnTeteMetadonnees(brut)
        setForm((f) => ({
          ...f,
          titre: f.titre || entete.titre,
          slug: f.slug || (entete.titre ? slugDepuisTitre(entete.titre) : f.slug),
          genre: f.genre || entete.genre,
          region: f.region || entete.region,
          description: f.description || entete.description,
        }))
        contenu = extraireTexteBrut(entete.resteDuTexte || brut)
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

  // --- Upload multiple : un conte par fichier, titre+slug auto-détectés, genre et région
  // choisis une fois pour tout le lot, créés en brouillon.
  async function importerLot() {
    if (fichiersLot.length === 0) return
    setLotEnCours(true)
    setLotResultats(null)
    const resultats = []
    const slugsUtilises = new Set((contes || []).map((c) => c.slug))

    for (let i = 0; i < fichiersLot.length; i++) {
      const fichier = fichiersLot[i]
      setLotProgression({ index: i + 1, total: fichiersLot.length, nom: fichier.name })
      try {
        const type = detecterType(fichier.name)
        let contenu
        let entete = null
        if (type === 'pdf') {
          const bytes = new Uint8Array(await fichier.arrayBuffer())
          contenu = await extrairePdfDepuisUrl(bytes, null, () => {})
        } else if (type === 'epub') {
          contenu = await extraireEpub(await fichier.arrayBuffer(), () => {})
        } else if (type === 'docx') {
          contenu = await extraireDocx(await fichier.arrayBuffer())
        } else {
          const brut = await fichier.text()
          entete = extraireEnTeteMetadonnees(brut)
          contenu = extraireTexteBrut(entete.resteDuTexte || brut)
        }

        const titre = (entete?.titre) || detecterTitreLivre(fichier.name, contenu)
        const slug = slugUnique(slugDepuisTitre(titre), slugsUtilises)
        slugsUtilises.add(slug)

        const data = new FormData()
        data.append('titre', titre)
        data.append('slug', slug)
        data.append('auteur', '')
        data.append('description', entete?.description || '')
        data.append('genre', entete?.genre || genreLot)
        data.append('region', entete?.region || regionLot)
        data.append('genere_par_ia', 'true')
        data.append('verifie_par', '')
        data.append('fichier', fichier)
        data.append('fichier_type', type)
        data.append('contenu_extrait', JSON.stringify(contenu))
        data.append('statut', 'brouillon')

        const res = await fetch('/api/admin/conte-africain', { method: 'POST', body: data })
        const resultat = await res.json()
        resultats.push({ nom: fichier.name, titre, ok: res.ok, message: res.ok ? `/contes-africains/${resultat.slug}` : resultat.error })
      } catch (e) {
        resultats.push({ nom: fichier.name, titre: '—', ok: false, message: e?.message || String(e) })
      }
    }

    setLotResultats(resultats)
    setLotProgression(null)
    setLotEnCours(false)
    setFichiersLot([])
    charger()
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

  const champ = (label, field, type = 'text', readOnly = false, options = []) => (
    <div>
      <label className="text-xs font-mono uppercase tracking-wide text-papier/40 block mb-2">{label}</label>
      {type === 'textarea' ? (
        <textarea value={form[field]} onChange={(e) => update(field, e.target.value)} rows={4} readOnly={readOnly}
          className={`w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier text-sm leading-relaxed focus:outline-none focus:border-[#e69742] transition-colors ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`} />
      ) : type === 'select' ? (
        <select value={form[field]} onChange={(e) => update(field, e.target.value)}
          className="w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier text-sm focus:outline-none focus:border-[#e69742] transition-colors">
          <option value="">— Choisir un genre —</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input type={type} value={form[field]} onChange={(e) => update(field, e.target.value)} readOnly={readOnly}
          className={`w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier text-sm focus:outline-none focus:border-[#e69742] transition-colors ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`} />
      )}
    </div>
  )

  return (
    <div className="px-6 pt-16 pb-24 max-w-xl mx-auto lever">
      <p className="text-[#e69742] text-xs font-mono uppercase tracking-[0.2em] mb-3">Encre — Admin</p>
      <h1 className="font-display text-4xl text-papier mb-2">{edition ? 'Modifier les infos du conte' : 'Publier un conte africain'}</h1>
      <p className="text-papier/45 text-sm mb-10 leading-relaxed">
        {edition
          ? "Le fichier et le texte ne changent pas ici — seules les informations. Pour le texte, utilise \"Modifier le texte\" depuis la liste."
          : 'Un conte ou une histoire traditionnelle, livré en un seul fichier (PDF, Markdown ou texte).'}
        <br /><a href="/admin" className="text-[#e69742] hover:brightness-125">← Retour à l'admin des romans</a>
      </p>

      <div className="space-y-6">
        {champ('Titre du conte', 'titre')}
        {champ('Slug (identifiant dans l\'URL)', 'slug', 'text', !!edition)}
        {champ('Auteur / conteur (optionnel)', 'auteur')}
        {champ('Description / résumé', 'description', 'textarea')}
        {champ('Genre (optionnel)', 'genre', 'select', false, GENRES_CONTES_AFRICAINS)}
        {champ('Région / origine (ex. Bénin, Sénégal, Mali...)', 'region')}

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
        </div>
        )}

        <div className="border-t border-ligne pt-5">
          <p className="text-[#e69742] text-xs font-mono uppercase tracking-widest mb-2">Upload multiple</p>
          <p className="text-papier/40 text-xs mb-4 leading-relaxed">
            Plusieurs fichiers d'un coup → un conte par fichier, titre et slug détectés automatiquement, créés en brouillon.
          </p>
          <input
            type="file" multiple accept=".pdf,.md,.txt,.epub,.docx,application/pdf,text/markdown,text/plain,application/epub+zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => { setFichiersLot(Array.from(e.target.files || [])); setLotResultats(null) }}
            className="w-full text-papier text-sm mb-3"
          />
          {fichiersLot.length > 0 && (
            <p className="text-papier/50 text-xs font-mono mb-3">{fichiersLot.length} fichier(s) sélectionné(s)</p>
          )}
          <select
            value={genreLot} onChange={(e) => setGenreLot(e.target.value)}
            className="w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier text-sm mb-3 focus:outline-none focus:border-[#e69742] transition-colors"
          >
            <option value="">Genre pour tout le lot (optionnel)</option>
            {GENRES_CONTES_AFRICAINS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <input
            type="text" value={regionLot} onChange={(e) => setRegionLot(e.target.value)}
            placeholder="Région / origine pour tout le lot (optionnel)"
            className="w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier text-sm mb-3 focus:outline-none focus:border-[#e69742] transition-colors"
          />
          <button
            type="button" onClick={importerLot} disabled={lotEnCours || fichiersLot.length === 0}
            className="w-full bg-encreClair border border-[#e69742]/40 text-[#e69742] font-medium rounded-lg px-3 py-3.5 hover:bg-[#e69742]/10 transition-all disabled:opacity-50"
          >
            {lotEnCours ? `Import ${lotProgression?.index || ''}/${lotProgression?.total || ''} — ${lotProgression?.nom || ''}` : `Importer le lot (${fichiersLot.length})`}
          </button>
          {lotResultats && (
            <div className="mt-4 space-y-1.5">
              {lotResultats.map((r, i) => (
                <p key={i} className={`text-xs font-mono ${r.ok ? 'text-papier/60' : 'text-red-400'}`}>
                  {r.ok ? '✓' : '✗'} {r.titre} — {r.message}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-ligne pt-5">
          <p className="text-[#e69742] text-xs font-mono uppercase tracking-widest mb-4">Transparence</p>
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
              className="flex-1 bg-[#e69742] text-encre text-sm font-medium rounded-lg px-3 py-3 hover:brightness-110 transition-all disabled:opacity-50">
              {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        ) : !apercu ? (
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

            <div className="flex items-center gap-2 mb-2">
              <span className="text-[0.65rem] font-mono uppercase tracking-wide text-papier/40 border border-ligne rounded-full px-2.5 py-1">
                {{ gratuit: 'Gratuit', pourboire: 'Gratuit + pourboire', payant: 'Payant', bonus: 'Gratuit + bonus payant' }[c.mode_monetisation || 'gratuit']}
                {c.prix_fcfa > 0 && (c.mode_monetisation === 'payant' || c.mode_monetisation === 'bonus') ? ` · ${c.prix_fcfa} FCFA` : ''}
              </span>
              <button
                onClick={() => (monetisationOuverte === c.id ? setMonetisationOuverte(null) : ouvrirMonetisation(c))}
                className="text-[0.65rem] font-mono text-[#e69742] hover:brightness-125"
              >
                {monetisationOuverte === c.id ? 'Fermer' : 'Modifier'}
              </button>
            </div>

            {monetisationOuverte === c.id && (
              <div className="bg-encre border border-ligne rounded-lg p-4 mb-3 space-y-3">
                <div>
                  <label className="text-xs font-mono uppercase tracking-wide text-papier/40 block mb-2">Mode de monétisation</label>
                  <select
                    value={monetisation[c.id]?.mode_monetisation}
                    onChange={(e) => majMonetisation(c.id, 'mode_monetisation', e.target.value)}
                    className="w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier text-sm focus:outline-none focus:border-[#e69742]"
                  >
                    <option value="gratuit">Gratuit</option>
                    <option value="pourboire">Gratuit + pourboire libre</option>
                    <option value="payant">Entièrement payant</option>
                    <option value="bonus">Gratuit + bonus payant à côté</option>
                  </select>
                </div>
                {(monetisation[c.id]?.mode_monetisation === 'payant' || monetisation[c.id]?.mode_monetisation === 'bonus') && (
                  <div>
                    <label className="text-xs font-mono uppercase tracking-wide text-papier/40 block mb-2">
                      Prix en FCFA {monetisation[c.id]?.mode_monetisation === 'bonus' ? '(du bonus)' : '(du conte entier)'}
                    </label>
                    <input
                      type="number" min="0" step="50"
                      value={monetisation[c.id]?.prix_fcfa}
                      onChange={(e) => majMonetisation(c.id, 'prix_fcfa', e.target.value)}
                      className="w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier text-sm focus:outline-none focus:border-[#e69742]"
                    />
                  </div>
                )}
                {monetisation[c.id]?.mode_monetisation === 'bonus' && (
                  <div>
                    <label className="text-xs font-mono uppercase tracking-wide text-papier/40 block mb-2">Texte du bonus (postface, notes, version inédite...)</label>
                    <textarea
                      rows={4}
                      value={monetisation[c.id]?.bonus_contenu}
                      onChange={(e) => majMonetisation(c.id, 'bonus_contenu', e.target.value)}
                      className="w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier text-sm leading-relaxed focus:outline-none focus:border-[#e69742]"
                    />
                  </div>
                )}
                <button
                  onClick={() => sauvegarderMonetisation(c.id)}
                  className="w-full bg-[#e69742] text-encre text-sm font-medium rounded-lg px-3 py-2.5 hover:brightness-110 transition-all"
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
                href={`/contes-africains/${c.slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono uppercase text-papier/40 hover:text-[#e69742] transition-colors"
              >
                Aperçu ↗
              </a>
              <a href={`/admin/contes-africains/${c.id}/modifier`} className="text-xs font-mono uppercase text-papier/40 hover:text-[#e69742] transition-colors">Modifier le texte</a>
              <button onClick={() => editer(c)} className="text-xs font-mono uppercase text-papier/40 hover:text-[#e69742] transition-colors">Modifier les infos</button>
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
