import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function verifierAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user && user.email === process.env.ADMIN_EMAIL
}

export async function GET(request) {
  if (!(await verifierAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  const admin = createAdminClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (id) {
    const { data: livre, error } = await admin.from('livres').select('*').eq('id', id).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ livre })
  }

  const { data: livres, error } = await admin.from('livres').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ livres })
}

export async function POST(request) {
  if (!(await verifierAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const admin = createAdminClient()
  const form = await request.formData()

  const titre = form.get('titre')
  const sousTitre = form.get('sous_titre')
  const slug = form.get('slug')
  const auteur = form.get('auteur')
  const description = form.get('description')
  const genre = form.get('genre')
  const verifiePar = form.get('verifie_par')
  const generePar = form.get('genere_par_ia') === 'true'
  const fichier = form.get('fichier')
  const fichierType = form.get('fichier_type') || 'pdf' // 'pdf' | 'md' | 'txt' | 'epub' | 'docx'
  const contenuExtraitBrut = form.get('contenu_extrait') // JSON déjà calculé côté admin
  const statut = form.get('statut') === 'publie' ? 'publie' : 'brouillon'

  if (!titre || !slug || !fichier) {
    return NextResponse.json({ error: 'Titre, slug et fichier requis' }, { status: 400 })
  }

  const extensions = { pdf: 'pdf', md: 'md', txt: 'txt', epub: 'epub', docx: 'docx' }
  const typesContenu = {
    pdf: 'application/pdf',
    md: 'text/markdown',
    txt: 'text/plain',
    epub: 'application/epub+zip',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }
  const extension = extensions[fichierType] || 'pdf'

  const cheminFichier = `${slug}-${Date.now()}.${extension}`
  const bytes = new Uint8Array(await fichier.arrayBuffer())

  const { error: erreurUpload } = await admin.storage.from('livres').upload(cheminFichier, bytes, {
    contentType: typesContenu[fichierType] || 'application/pdf',
  })
  if (erreurUpload) return NextResponse.json({ error: erreurUpload.message }, { status: 400 })

  const { data: urlPublique } = admin.storage.from('livres').getPublicUrl(cheminFichier)

  let contenuExtrait = null
  if (contenuExtraitBrut) {
    try { contenuExtrait = JSON.parse(contenuExtraitBrut) } catch { contenuExtrait = null }
  }

  const { error: erreurInsert } = await admin.from('livres').insert({
    titre, sous_titre: sousTitre || null, slug, auteur, description, genre,
    fichier_url: urlPublique.publicUrl,
    fichier_type: fichierType,
    genere_par_ia: generePar,
    verifie_par: verifiePar || null,
    statut,
    contenu_extrait: contenuExtrait,
    contenu_extrait_le: contenuExtrait ? new Date().toISOString() : null,
  })
  if (erreurInsert) return NextResponse.json({ error: erreurInsert.message }, { status: 400 })

  return NextResponse.json({ ok: true, slug })
}

export async function PATCH(request) {
  if (!(await verifierAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  const body = await request.json()
  const admin = createAdminClient()

  if (body.type === 'vider_cache') {
    // Force une nouvelle extraction du texte au prochain chargement (ex. après une
    // amélioration du moteur d'extraction) au lieu de garder l'ancien résultat en cache.
    const { error } = await admin.from('livres').update({ contenu_extrait: null, contenu_extrait_le: null }).eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (body.type === 'statut') {
    const { error } = await admin.from('livres').update({ statut: body.statut === 'publie' ? 'publie' : 'brouillon' }).eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (body.type === 'editer_contenu') {
    // Sauvegarde une correction manuelle du contenu déjà extrait (ex. un titre mal détecté,
    // une phrase mal recollée entre deux pages). body.contenu est déjà au format {sections, tableMatieres}.
    const { error } = await admin.from('livres').update({ contenu_extrait: body.contenu }).eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (body.type === 'metadonnees') {
    const { error } = await admin
      .from('livres')
      .update({
        titre: body.titre, sous_titre: body.sous_titre || null, auteur: body.auteur || null, description: body.description || null, genre: body.genre || null,
        genere_par_ia: body.genere_par_ia ?? true, verifie_par: body.verifie_par || null,
      })
      .eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (body.type === 'monetisation') {
    const modesValides = ['gratuit', 'pourboire', 'payant', 'bonus']
    if (!modesValides.includes(body.mode_monetisation)) {
      return NextResponse.json({ error: 'Mode invalide' }, { status: 400 })
    }
    const { error } = await admin
      .from('livres')
      .update({
        mode_monetisation: body.mode_monetisation,
        prix_fcfa: Number(body.prix_fcfa) || 0,
        bonus_contenu: body.bonus_contenu || null,
      })
      .eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Type inconnu' }, { status: 400 })
}

export async function DELETE(request) {
  if (!(await verifierAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const admin = createAdminClient()
  const { error } = await admin.from('livres').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
