'use client'

import { useEffect, useState } from 'react'
import { CouvertureAdmin } from '@/components/admin/CouvertureAdmin'
import PartageSocial from '@/components/admin/PartageSocial'
import { extrairePdfDepuisUrl } from '@/lib/extractionPdf'
import { extraireTexteBrut } from '@/lib/extractionTexte'
import { extraireDocx } from '@/lib/extractionDocx'
import { extraireEpub } from '@/lib/extractionEpub'
import { detecterTitreLivre, slugDepuisTitre, slugUnique, titreDepuisNomFichier } from '@/lib/detectionTitre'
import { extraireEnTeteMetadonnees } from '@/lib/parseEnTete'
import { NOMS_CONNUS } from '@/lib/verificateurs'
import { GENRES_LIVRES } from '@/lib/genres'

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
    titre: '', sous_titre: '', slug: '', auteur: '', description: '', genre: '', verifie_par: '', genere_par_ia: true,
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
      titre: livre.titre, sous_titre: livre.sous_titre || '', slug: livre.slug, auteur: livre.auteur || '', description: livre.description || '',
      genre: livre.genre || '', verifie_par: livre.verifie_par || '', genere_par_ia: livre.genere_par_ia ?? true,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function annulerEdition() {
    setEdition(null)
    setForm({ titre: '', sous_titre: '', slug: '', auteur: '', description: '', genre: '', verifie_par: '', genere_par_ia: true })
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

  // --- Upload multiple ---
  const [fichiersLot, setFichiersLot] = useState([])
  const [genreLot, setGenreLot] = useState('')
  const [lotEnCours, setLotEnCours] = useState(false)
  const [lotProgression, setLotProgression] = useState(null) // { index, total }
  const [lotResultats, setLotResultats] = useState(null) // [{ nom, titre, ok, message }]

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
    const type = detecterType(fichier.name)
    // Le slug n'est nécessaire avant extraction que pour le PDF (chemin de stockage des images
    // extraites) — pour .md/.txt/.epub/.docx, il peut être déduit après coup du contenu.
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
        if (contenu.metadonnees) {
          const m = contenu.metadonnees
          setForm((f) => ({ ...f, genre: f.genre || m.genre, description: f.description || m.description }))
        }
      } else if (type === 'epub') {
        const bytes = await fichier.arrayBuffer()
        contenu = await extraireEpub(bytes, (p) => setProgression(p))
      } else if (type === 'docx') {
        const bytes = await fichier.arrayBuffer()
        contenu = await extraireDocx(bytes)
        if (contenu.sousTitreDetecte) {
          setForm((f) => ({ ...f, sous_titre: f.sous_titre || contenu.sousTitreDetecte }))
        }
      } else {
        // .md / .txt : on détecte d'abord l'en-tête de métadonnées optionnel (titre, genre,
        // résumé) produit par les prompts ENGINE, avant de segmenter le reste du texte —
        // évite de retrouver le titre du livre dupliqué comme une "partie" dans le lecteur,
        // et pré-remplit le formulaire pour ne rien ressaisir à la main.
        const brut = await fichier.text()
        const entete = extraireEnTeteMetadonnees(brut)
        setForm((f) => ({
          ...f,
          titre: f.titre || entete.titre,
          slug: f.slug || (entete.titre ? slugDepuisTitre(entete.titre) : f.slug),
          genre: f.genre || entete.genre,
          description: f.description || entete.description,
        }))
        contenu = extraireTexteBrut(entete.resteDuTexte || brut)
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
      setForm({ titre: '', sous_titre: '', slug: '', auteur: '', description: '', genre: '', verifie_par: '', genere_par_ia: true })
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

  // --- Upload multiple : chaque fichier devient un livre distinct, titre+slug auto-détectés,
  // un seul genre choisi pour tout le lot, créés en brouillon pour validation ensuite en liste.
  async function importerLot() {
    if (fichiersLot.length === 0) return
    setLotEnCours(true)
    setLotResultats(null)
    const resultats = []
    const slugsUtilises = new Set((livres || []).map((l) => l.slug))

    for (let i = 0; i < fichiersLot.length; i++) {
      const fichier = fichiersLot[i]
      setLotProgression({ index: i + 1, total: fichiersLot.length, nom: fichier.name })
      try {
        const type = detecterType(fichier.name)
        const slugProvisoire = slugUnique(slugDepuisTitre(titreDepuisNomFichier(fichier.name)), slugsUtilises)
        slugsUtilises.add(slugProvisoire)

        let contenu
        let entete = null
        if (type === 'pdf') {
          const bytes = new Uint8Array(await fichier.arrayBuffer())
          contenu = await extrairePdfDepuisUrl(bytes, (nom, dataUrl) => televerserImageAdmin(slugProvisoire, nom, dataUrl), () => {})
          if (contenu.metadonnees) entete = { titre: '', genre: contenu.metadonnees.genre, description: contenu.metadonnees.description }
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
        const slug = slugProvisoire

        const data = new FormData()
        data.append('titre', titre)
        data.append('slug', slug)
        data.append('auteur', '')
        data.append('description', entete?.description || '')
        data.append('sous_titre', contenu.sousTitreDetecte || '')
        data.append('genre', entete?.genre || genreLot)
        data.append('genere_par_ia', 'true')
        data.append('verifie_par', '')
        data.append('fichier', fichier)
        data.append('fichier_type', type)
        data.append('contenu_extrait', JSON.stringify(contenu))
        data.append('statut', 'brouillon')

        const res = await fetch('/api/admin/livre', { method: 'POST', body: data })
        const resultat = await res.json()
        resultats.push({ nom: fichier.name, titre, ok: res.ok, message: res.ok ? `/livres/${resultat.slug}` : resultat.error })
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

  const champ = (label, field, type = 'text', readOnly = false, options = [], listId = null) => (
    <div>
      <label className="text-xs font-mono uppercase tracking-wide text-papier/40 block mb-2">{label}</label>
      {type === 'textarea' ? (
        <textarea value={form[field]} onChange={(e) => update(field, e.target.value)} rows={4} readOnly={readOnly}
          className={`w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier text-sm leading-relaxed focus:outline-none focus:border-or transition-colors ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`} />
      ) : type === 'select' ? (
        <select value={form[field]} onChange={(e) => update(field, e.target.value)}
          className="w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier text-sm focus:outline-none focus:border-or transition-colors">
          <option value="">— Choisir un genre —</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input type={type} value={form[field]} onChange={(e) => update(field, e.target.value)} readOnly={readOnly} list={listId || undefined}
          className={`w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier text-sm focus:outline-none focus:border-or transition-colors ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`} />
      )}
    </div>
  )

  return (
    <div className="px-6 pt-16 pb-24 max-w-xl mx-auto lever">
      <datalist id="noms-connus">
        {NOMS_CONNUS.map((n) => <option key={n} value={n} />)}
      </datalist>
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
        {champ('Sous-titre (optionnel)', 'sous_titre')}
        {champ('Slug (identifiant dans l\'URL)', 'slug', 'text', !!edition)}
        {champ('Auteur (optionnel)', 'auteur', 'text', false, [], 'noms-connus')}
        {champ('Description / résumé', 'description', 'textarea')}
        {champ('Genre', 'genre', 'select', false, GENRES_LIVRES)}

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
          <p className="text-or text-xs font-mono uppercase tracking-widest mb-2">Upload multiple</p>
          <p className="text-papier/40 text-xs mb-4 leading-relaxed">
            Plusieurs fichiers d'un coup → un livre par fichier, titre et slug détectés automatiquement (contenu ou nom de fichier), créés en brouillon.
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
            className="w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier text-sm mb-3 focus:outline-none focus:border-or transition-colors"
          >
            <option value="">Genre pour tout le lot (optionnel)</option>
            {GENRES_LIVRES.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <button
            type="button" onClick={importerLot} disabled={lotEnCours || fichiersLot.length === 0}
            className="w-full bg-encreClair border border-or/40 text-or font-medium rounded-lg px-3 py-3.5 hover:bg-or/10 transition-all disabled:opacity-50"
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
          <p className="text-or text-xs font-mono uppercase tracking-widest mb-4">Transparence</p>
          <label className="flex items-center gap-2 text-sm text-papier/70 mb-4">
            <input type="checkbox" checked={form.genere_par_ia} onChange={(e) => update('genere_par_ia', e.target.checked)} />
            Contenu généré avec l'aide de l'IA
          </label>
          {champ('Vérifié par (nom, optionnel)', 'verifie_par', 'text', false, [], 'noms-connus')}
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
            <div className="flex items-center justify-between mb-1 gap-2">
              <button
                onClick={() => basculerPliLivre(l.id)}
                className="flex items-center gap-2 text-left min-w-0 flex-1"
                disabled={sections.length === 0}
              >
                {sections.length > 0 && (
                  <span className={`text-papier/30 text-xs transition-transform shrink-0 ${plie ? '-rotate-90' : ''}`}>▼</span>
                )}
                <span className="text-sm text-papier/70 truncate">{l.titre}</span>
              </button>
              <CouvertureAdmin
                section="livre"
                id={l.id}
                url={l.couverture_url}
                onUploaded={(url) => setLivres((ls) => ls.map((x) => (x.id === l.id ? { ...x, couverture_url: url } : x)))}
              />
              <PartageSocial
                type="livre"
                titre={l.titre}
                resume={l.description}
                genre={l.genre}
                slug={l.slug}
                couvertureUrl={l.couverture_url}
              />
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
                  <span key={i} className="flex items-center gap-1 font-mono text-[0.65rem] text-papier/50 border border-ligne rounded-full pl-2 pr-1 py-1">
                    {s.pilLabel}
                    <PartageSocial
                      compact
                      type="livre"
                      titre={l.titre}
                      resume={l.description}
                      genre={l.genre}
                      slug={l.slug}
                      couvertureUrl={l.couverture_url}
                      chapitreLabel={s.blocs?.[0]?.texte || s.pilLabel}
                    />
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 mt-2">
              <a
                href={`/livres/${l.slug}?admin=1`}
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
