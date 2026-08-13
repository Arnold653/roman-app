'use client'

import { useEffect, useRef, useState } from 'react'
import { parserMarkdownRoman } from '@/lib/parseMd'

const FORM_VIDE = {
  titre: '', slug: '', resume: '', genre: '', niveau_theme: 1,
  genere_par_ia: true, verifie_par: '',
  numero: 1, chapitre_titre: '', contenu: '', citation_fin: '', publie_le: '',
}

export default function AdminPage() {
  const [form, setForm] = useState(FORM_VIDE)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [romans, setRomans] = useState(null)
  const [edition, setEdition] = useState(null) // { type: 'roman' | 'chapitre', id }
  const [modeChapitreSeul, setModeChapitreSeul] = useState(false) // ajout rapide à un roman existant
  const [important, setImportant] = useState(null) // aperçu d'un import .md en attente de confirmation
  const [romansPlies, setRomansPlies] = useState(new Set())
  const [planifierImport, setPlanifierImport] = useState(false)
  const [planifDepart, setPlanifDepart] = useState('')
  const [planifIntervalle, setPlanifIntervalle] = useState(3)
  const inputFichierRef = useRef(null)

  useEffect(() => {
    chargerRomans()
  }, [])

  async function chargerRomans() {
    const res = await fetch('/api/admin/roman')
    if (res.ok) {
      const data = await res.json()
      setRomans(data.romans)
    }
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function basculerPli(id) {
    setRomansPlies((s) => {
      const suivant = new Set(s)
      if (suivant.has(id)) suivant.delete(id)
      else suivant.add(id)
      return suivant
    })
  }

  function reinitialiser() {
    setForm(FORM_VIDE)
    setEdition(null)
    setModeChapitreSeul(false)
    setMessage('')
  }

  function editerRoman(roman) {
    setModeChapitreSeul(false)
    setEdition({ type: 'roman', id: roman.id })
    setForm({
      ...FORM_VIDE, titre: roman.titre, slug: roman.slug, resume: roman.resume, genre: roman.genre,
      genere_par_ia: roman.genere_par_ia ?? true, verifie_par: roman.verifie_par || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function editerChapitre(roman, chapitre) {
    setModeChapitreSeul(false)
    setEdition({ type: 'chapitre', id: chapitre.id })
    setForm({
      ...FORM_VIDE,
      titre: roman.titre, slug: roman.slug, resume: roman.resume, genre: roman.genre,
      numero: chapitre.numero,
      chapitre_titre: chapitre.titre || '',
      contenu: chapitre.contenu || '',
      citation_fin: chapitre.citation_fin || '',
      publie_le: chapitre.publie_le ? chapitre.publie_le.slice(0, 16) : '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Ajout rapide : pré-remplit le roman (masqué) et suggère le prochain numéro de chapitre
  function nouveauChapitrePour(roman) {
    setEdition(null)
    setModeChapitreSeul(true)
    const prochainNumero = (roman.chapitres.reduce((max, c) => Math.max(max, c.numero), 0) || 0) + 1
    setForm({
      ...FORM_VIDE,
      titre: roman.titre, slug: roman.slug, resume: roman.resume, genre: roman.genre,
      numero: prochainNumero,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function basculerStatutRoman(roman) {
    const nouveauStatut = roman.statut_visibilite === 'publie' ? 'brouillon' : 'publie'
    const res = await fetch('/api/admin/roman', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'roman_statut', id: roman.id, statut: nouveauStatut }),
    })
    if (res.ok) chargerRomans()
  }

  async function supprimerRoman(roman) {
    if (!confirm(`Supprimer "${roman.titre}" et TOUS ses chapitres ? C'est irréversible.`)) return
    const res = await fetch(`/api/admin/roman?type=roman&id=${roman.id}`, { method: 'DELETE' })
    if (res.ok) { setMessage(`"${roman.titre}" supprimé.`); chargerRomans() }
    else setMessage('Erreur lors de la suppression.')
  }

  async function supprimerChapitre(roman, chapitre) {
    if (!confirm(`Supprimer le chapitre ${chapitre.numero} de "${roman.titre}" ?`)) return
    const res = await fetch(`/api/admin/roman?type=chapitre&id=${chapitre.id}`, { method: 'DELETE' })
    if (res.ok) { setMessage(`Chapitre ${chapitre.numero} supprimé.`); chargerRomans() }
    else setMessage('Erreur lors de la suppression.')
  }

  async function envoyer(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const enEdition = !!edition
    const url = '/api/admin/roman'
    const method = enEdition ? 'PATCH' : 'POST'
    const body = enEdition ? { type: edition.type, id: edition.id, ...form } : form

    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setMessage(`Erreur : ${data.error}`)
    } else {
      setMessage(enEdition ? 'Modifications enregistrées ✓' : `Publié ✓ — visible sur /roman/${data.slug}`)
      reinitialiser()
      chargerRomans()
    }
  }

  async function nettoyerTitres() {
    if (!confirm('Retirer les tirets/deux-points en trop au début des titres de chapitres existants ?')) return
    const res = await fetch('/api/admin/roman', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'nettoyage_titres' }),
    })
    const data = await res.json()
    if (res.ok) {
      setMessage(`${data.corriges} titre(s) corrigé(s) ✓`)
      chargerRomans()
    } else {
      setMessage(`Erreur : ${data.error}`)
    }
  }

  // --- Import .md / .pdf / .epub / .docx ---
  const [importEnCours, setImportEnCours] = useState(false)

  function finaliserImport(resultat) {
    setImportant(resultat)
    setPlanifierImport(false)
    const maintenant = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    setPlanifDepart(maintenant.toISOString().slice(0, 16))
    setPlanifIntervalle(3)
  }

  async function choisirFichier(e) {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    const ext = fichier.name.split('.').pop().toLowerCase()

    if (ext === 'md') {
      const lecteur = new FileReader()
      lecteur.onload = (evt) => finaliserImport(parserMarkdownRoman(evt.target.result))
      lecteur.readAsText(fichier)
      return
    }

    setImportEnCours(true)
    setMessage('')
    try {
      let contenu
      if (ext === 'pdf') {
        const { extrairePdfDepuisUrl } = await import('@/lib/extractionPdf')
        const bytes = new Uint8Array(await fichier.arrayBuffer())
        contenu = await extrairePdfDepuisUrl(bytes, null, () => {})
      } else if (ext === 'epub') {
        const { extraireEpub } = await import('@/lib/extractionEpub')
        contenu = await extraireEpub(await fichier.arrayBuffer())
      } else if (ext === 'docx') {
        const { extraireDocx } = await import('@/lib/extractionDocx')
        contenu = await extraireDocx(await fichier.arrayBuffer())
      } else {
        setMessage('Format non pris en charge. Utilise .md, .pdf, .epub ou .docx.')
        return
      }

      const { paragraphesVersMarkdown } = await import('@/lib/paragraphesVersMarkdown')
      const markdown = paragraphesVersMarkdown(contenu.paragraphes)
      const resultat = parserMarkdownRoman(markdown)

      if (!resultat.chapitres || resultat.chapitres.length <= 1) {
        setMessage(
          "Un seul chapitre détecté — si le fichier en contient plusieurs, vérifie que les titres de chapitre suivent bien un format reconnu (ex. \"Chapitre 4 : Titre\")."
        )
      }
      finaliserImport(resultat)
    } catch (err) {
      setMessage(`Erreur d'import : ${err?.message || err}`)
    } finally {
      setImportEnCours(false)
    }
  }

  // Étale la sortie des chapitres à partir de `depart`, un chapitre tous les `intervalleJours` jours
  // (chapitre 1 = depart, chapitre 2 = depart + intervalle, etc.). Chaque date reste modifiable
  // ensuite au cas par cas dans l'aperçu, pour organiser une « première » particulière par exemple.
  function repartirChapitres(depart, intervalleJours) {
    if (!important || !depart) return
    const base = new Date(depart)
    const chapitres = important.chapitres.map((c, i) => {
      const date = new Date(base.getTime() + i * intervalleJours * 86400000)
      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      return { ...c, publie_le: local.toISOString().slice(0, 16) }
    })
    setImportant({ ...important, chapitres })
  }

  function basculerPlanification(active) {
    setPlanifierImport(active)
    if (active) {
      repartirChapitres(planifDepart, planifIntervalle)
    } else {
      setImportant({ ...important, chapitres: important.chapitres.map((c) => ({ ...c, publie_le: '' })) })
    }
  }

  function modifierDateChapitre(numero, valeur) {
    setImportant({
      ...important,
      chapitres: important.chapitres.map((c) => (c.numero === numero ? { ...c, publie_le: valeur } : c)),
    })
  }

  async function confirmerImport() {
    if (!important) return
    setLoading(true)
    setMessage('')

    const slug = form.slug || important.titre.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    let dernierSlug = slug
    for (const chap of important.chapitres) {
      const res = await fetch('/api/admin/roman', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titre: important.titre,
          slug,
          resume: important.resume,
          genre: important.genre,
          numero: chap.numero,
          chapitre_titre: chap.titre,
          contenu: chap.contenu,
          citation_fin: chap.citation_fin,
          publie_le: chap.publie_le || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(`Erreur au chapitre ${chap.numero} : ${data.error}`)
        setLoading(false)
        return
      }
      dernierSlug = data.slug
    }

    setLoading(false)
    setMessage(`${important.chapitres.length} chapitre(s) importé(s) ✓ — /roman/${dernierSlug}`)
    setImportant(null)
    chargerRomans()
  }

  const champ = (label, field, type = 'text') => (
    <div>
      <label className="text-xs font-mono uppercase tracking-wide text-papier/40 block mb-2">{label}</label>
      {type === 'textarea' ? (
        <textarea
          value={form[field]}
          onChange={(e) => update(field, e.target.value)}
          rows={8}
          className="w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier text-sm leading-relaxed focus:outline-none focus:border-or transition-colors"
        />
      ) : (
        <input
          type={type}
          value={form[field]}
          onChange={(e) => update(field, type === 'number' ? Number(e.target.value) : e.target.value)}
          className="w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier text-sm focus:outline-none focus:border-or transition-colors"
        />
      )}
    </div>
  )

  return (
    <div className="px-6 pt-16 pb-24 max-w-xl mx-auto lever">
      <p className="text-or text-xs font-mono uppercase tracking-[0.2em] mb-3">Encre — Admin</p>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-4xl text-papier">
          {edition ? (edition.type === 'roman' ? 'Modifier le roman' : 'Modifier le chapitre') : modeChapitreSeul ? 'Nouveau chapitre' : 'Publier'}
        </h1>
      </div>
      <a href="/admin/livres" className="inline-block text-xs font-mono uppercase tracking-wide text-or hover:brightness-125 mb-4">
        Gérer les livres (PDF) →
      </a>
      <div className="flex gap-2 mb-4">
        <button
          onClick={nettoyerTitres}
          className="text-xs font-mono uppercase tracking-wide border border-ligne rounded-full px-3 py-1.5 text-papier/60 hover:border-or hover:text-or transition-colors"
        >
          Nettoyer imports
        </button>
        <button
          onClick={() => inputFichierRef.current?.click()}
          className="text-xs font-mono uppercase tracking-wide border border-ligne rounded-full px-3 py-1.5 text-papier/60 hover:border-or hover:text-or transition-colors"
        >
          {importEnCours ? 'Import en cours…' : 'Importer un roman'}
        </button>
      </div>
      <input
        ref={inputFichierRef}
        type="file"
        accept=".md,.pdf,.epub,.docx,text/markdown,application/pdf,application/epub+zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={choisirFichier}
        className="hidden"
      />
      <p className="text-papier/45 text-sm mb-10 leading-relaxed">
        {modeChapitreSeul
          ? `Ajout rapide à « ${form.titre} » — les infos du roman restent inchangées.`
          : edition
          ? 'Modifie les champs ci-dessous puis enregistre.'
          : "Le roman est créé automatiquement s'il n'existe pas encore (basé sur le \"slug\"), sinon le chapitre s'y ajoute."}
      </p>

      <form onSubmit={envoyer} className="space-y-6">
        {!modeChapitreSeul && (
          <>
            <p className="text-or text-xs font-mono uppercase tracking-widest">Le roman</p>
            {champ('Titre du roman', 'titre')}
            {champ("Slug (identifiant dans l'URL, ex: le-dernier-refuge)", 'slug')}
            {champ('Résumé court', 'resume', 'textarea')}
            {champ('Genre (libre : thriller, romance, aventure...)', 'genre')}

            <label className="flex items-center gap-2 text-sm text-papier/70">
              <input
                type="checkbox"
                checked={form.genere_par_ia}
                onChange={(e) => update('genere_par_ia', e.target.checked)}
              />
              Généré avec l'aide de l'IA
            </label>
            {champ('Vérifié par (nom, optionnel)', 'verifie_par')}
          </>
        )}

        {edition?.type !== 'roman' && (
          <>
            <p className="text-or text-xs font-mono uppercase tracking-widest pt-4">Le chapitre</p>
            {champ('Numéro du chapitre', 'numero', 'number')}
            {champ('Titre du chapitre (optionnel)', 'chapitre_titre')}
            {champ('Texte du chapitre', 'contenu', 'textarea')}
            {champ('Citation/réflexion de fin (optionnel)', 'citation_fin')}
            <div>
              <label className="text-xs font-mono uppercase tracking-wide text-papier/40 block mb-2">
                Publication (laisser vide = immédiat)
              </label>
              <input
                type="datetime-local"
                value={form.publie_le}
                onChange={(e) => update('publie_le', e.target.value)}
                className="w-full bg-encreClair border border-ligne rounded-lg px-4 py-3 text-papier text-sm focus:outline-none focus:border-or transition-colors"
              />
              <p className="text-papier/30 text-xs mt-2">Programme la sortie : le chapitre reste invisible et n'envoie de notification qu'à cette date.</p>
            </div>
          </>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-or text-encre font-medium rounded-lg px-3 py-3.5 hover:brightness-110 transition-all disabled:opacity-50"
          >
            {loading ? 'Enregistrement...' : edition ? 'Enregistrer les modifications' : modeChapitreSeul ? 'Publier ce chapitre' : 'Publier'}
          </button>
          {(edition || modeChapitreSeul) && (
            <button type="button" onClick={reinitialiser} className="px-5 rounded-lg border border-ligne text-papier/60 hover:text-papier transition-colors">
              Annuler
            </button>
          )}
        </div>
      </form>

      {message && <p className="text-sm text-papier/60 mt-4 font-mono">{message}</p>}

      {important && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-6" onClick={() => setImportant(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-encreClair border border-ligne rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <p className="text-or text-xs font-mono uppercase tracking-widest mb-3">Aperçu de l'import</p>
            <p className="font-display text-xl text-papier mb-1">{important.titre || '(sans titre — utilise le slug déjà saisi)'}</p>
            <p className="text-papier/40 text-xs font-mono mb-4">{important.genre}</p>
            <p className="text-papier/60 text-sm mb-4">{important.resume}</p>
            <p className="text-papier/50 text-xs font-mono mb-3">{important.chapitres.length} chapitre(s) détecté(s) :</p>

            <label className="flex items-center gap-2 text-sm text-papier/70 mb-3">
              <input
                type="checkbox"
                checked={planifierImport}
                onChange={(e) => basculerPlanification(e.target.checked)}
              />
              Programmer la sortie des chapitres
            </label>

            {planifierImport && (
              <div className="grid grid-cols-2 gap-3 mb-4 bg-encre/40 border border-ligne rounded-lg p-3">
                <div>
                  <label className="text-xs font-mono uppercase tracking-wide text-papier/40 block mb-1">1ᵉʳ chapitre le</label>
                  <input
                    type="datetime-local"
                    value={planifDepart}
                    onChange={(e) => { setPlanifDepart(e.target.value); repartirChapitres(e.target.value, planifIntervalle) }}
                    className="w-full bg-encreClair border border-ligne rounded-lg px-2 py-2 text-papier text-xs focus:outline-none focus:border-or"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-wide text-papier/40 block mb-1">Puis tous les (jours)</label>
                  <input
                    type="number"
                    min="0"
                    value={planifIntervalle}
                    onChange={(e) => { const v = Number(e.target.value); setPlanifIntervalle(v); repartirChapitres(planifDepart, v) }}
                    className="w-full bg-encreClair border border-ligne rounded-lg px-2 py-2 text-papier text-xs focus:outline-none focus:border-or"
                  />
                </div>
              </div>
            )}

            <ul className="space-y-2 mb-6">
              {important.chapitres.map((c) => (
                <li key={c.numero} className="text-sm text-papier/70">
                  <div className="flex items-center justify-between gap-2">
                    <span>Ch. {c.numero} {c.titre && `— ${c.titre}`}</span>
                  </div>
                  {planifierImport && (
                    <input
                      type="datetime-local"
                      value={c.publie_le || ''}
                      onChange={(e) => modifierDateChapitre(c.numero, e.target.value)}
                      className="mt-1 w-full bg-encreClair border border-ligne rounded-lg px-2 py-1.5 text-papier/80 text-xs focus:outline-none focus:border-or"
                    />
                  )}
                </li>
              ))}
            </ul>
            <div className="flex gap-3">
              <button onClick={confirmerImport} disabled={loading} className="flex-1 bg-or text-encre font-medium rounded-lg px-3 py-3 disabled:opacity-50">
                {loading ? "Import en cours..." : "Confirmer l'import"}
              </button>
              <button onClick={() => setImportant(null)} className="px-5 rounded-lg border border-ligne text-papier/60">Annuler</button>
            </div>
          </div>
        </div>
      )}

      <div className="filet-or my-14" />

      <p className="text-or text-xs font-mono uppercase tracking-widest mb-6">Romans publiés</p>

      {romans === null && <p className="text-papier/35 text-sm font-mono">Chargement...</p>}
      {romans?.length === 0 && <p className="text-papier/35 text-sm font-mono">Rien publié pour l'instant.</p>}

      <div className="space-y-8">
        {romans?.map((roman) => {
          const plie = !romansPlies.has(roman.id)
          return (
          <div key={roman.id} className="border border-ligne rounded-lg p-5">
            <div className="flex items-start justify-between gap-3 mb-1">
              <button
                onClick={() => basculerPli(roman.id)}
                className="flex items-center gap-2 text-left min-w-0"
              >
                <span className={`text-papier/30 text-xs transition-transform shrink-0 ${plie ? '-rotate-90' : ''}`}>▼</span>
                <h3 className="font-display text-xl text-papier truncate">{roman.titre}</h3>
                <span className="text-papier/30 text-xs font-mono shrink-0">({roman.chapitres.length})</span>
              </button>
              <div className="flex items-center gap-3 shrink-0 font-mono text-xs uppercase tracking-wide">
                <a
                  href={`/roman/${roman.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-papier/50 hover:text-or transition-colors"
                >
                  Aperçu ↗
                </a>
                <button
                  onClick={() => basculerStatutRoman(roman)}
                  className={`rounded-full px-2.5 py-1 border ${
                    roman.statut_visibilite === 'publie' ? 'border-or/40 text-or' : 'border-papier/20 text-papier/40'
                  }`}
                >
                  {roman.statut_visibilite === 'publie' ? 'Publié' : 'Brouillon'}
                </button>
                <button onClick={() => editerRoman(roman)} className="text-papier/50 hover:text-or transition-colors">Éditer</button>
                <button onClick={() => supprimerRoman(roman)} className="text-papier/50 hover:text-grenat transition-colors">Suppr.</button>
              </div>
            </div>
            <p className="text-papier/35 text-xs font-mono mb-4">/{roman.slug} — {roman.genre}</p>

            {!plie && (
              <>
                <button
                  onClick={() => nouveauChapitrePour(roman)}
                  className="w-full text-sm border border-dashed border-or/40 text-or rounded-md py-2.5 mb-4 hover:bg-or/5 transition-colors"
                >
                  + Ajouter un chapitre
                </button>

                <div className="space-y-2">
                  {roman.chapitres.map((chapitre) => {
                    const programme = chapitre.publie_le && new Date(chapitre.publie_le) > new Date()
                    return (
                      <div key={chapitre.id} className="flex items-center justify-between bg-encreClair rounded-md px-4 py-2.5">
                        <span className="text-sm text-papier/70">
                          Ch. {chapitre.numero}{chapitre.titre ? ` — ${chapitre.titre}` : ''}
                          {programme && (
                            <span className="ml-2 text-[0.65rem] font-mono text-or border border-or/30 rounded-full px-2 py-0.5">
                              Programmé
                            </span>
                          )}
                        </span>
                        <div className="flex gap-3 shrink-0 font-mono text-xs uppercase tracking-wide">
                          <a
                            href={`/roman/${roman.slug}?ch=${chapitre.numero}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-papier/40 hover:text-or transition-colors"
                          >
                            Aperçu ↗
                          </a>
                          <button onClick={() => editerChapitre(roman, chapitre)} className="text-papier/40 hover:text-or transition-colors">Éditer</button>
                          <button onClick={() => supprimerChapitre(roman, chapitre)} className="text-papier/40 hover:text-grenat transition-colors">Suppr.</button>
                        </div>
                      </div>
                    )
                  })}
                  {roman.chapitres.length === 0 && <p className="text-papier/30 text-xs font-mono">Aucun chapitre.</p>}
                </div>
              </>
            )}
          </div>
          )
        })}
      </div>
    </div>
  )
}
