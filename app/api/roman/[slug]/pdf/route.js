import { createClient } from '@/lib/supabase/server'
import { genererPdfRoman } from '@/lib/pdfRoman'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  const supabase = createClient()

  const { data: roman } = await supabase.from('romans').select('*').eq('slug', params.slug).single()
  if (!roman) return NextResponse.json({ error: 'Roman introuvable' }, { status: 404 })

  const { data: chapitres } = await supabase
    .from('chapitres')
    .select('numero, titre, contenu, citation_fin')
    .eq('roman_id', roman.id)
    .lte('publie_le', new Date().toISOString())
    .order('numero', { ascending: true })

  if (!chapitres || chapitres.length === 0) {
    return NextResponse.json({ error: 'Aucun chapitre publié' }, { status: 400 })
  }

  const pdfBytes = await genererPdfRoman({
    titre: roman.titre,
    resume: roman.resume,
    genre: roman.genre,
    chapitres,
  })

  return new NextResponse(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${roman.slug}.pdf"`,
    },
  })
}
