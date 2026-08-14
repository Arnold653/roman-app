import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BadgeTransparence from '@/components/BadgeTransparence'
import LecteurConte from '@/components/LecteurConte'

export default async function ConteAfricainDetailPage({ params }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?suite=/contes-africains/${params.slug}`)
  }

  const { data: conte } = await supabase.from('contes_africains').select('*').eq('slug', params.slug).single()
  const estAdmin = user.email === process.env.ADMIN_EMAIL

  if (!conte || (conte.statut !== 'publie' && !estAdmin)) {
    return <div className="px-6 py-24 text-center text-papier/50 font-mono text-sm">Conte introuvable.</div>
  }

  const { data: progression } = await supabase
    .from('lecture_progress_contes_africains')
    .select('derniere_section')
    .eq('user_id', user.id)
    .eq('conte_id', conte.id)
    .maybeSingle()
  const sectionInitiale = progression?.derniere_section || 0

  return (
    <div className="px-6 pt-16 pb-24 max-w-2xl mx-auto lever">
      {conte.statut !== 'publie' && (
        <p className="font-mono text-[0.65rem] uppercase tracking-widest text-grenat border border-grenat/40 rounded-full px-2.5 py-1 inline-block mb-4">
          Brouillon — visible pour toi seul
        </p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        {conte.region && (
          <span className="font-mono text-[0.65rem] uppercase tracking-widest text-[#e69742] border border-[#e69742]/30 rounded-full px-2.5 py-1">
            {conte.region}
          </span>
        )}
        {conte.genre && (
          <span className="font-mono text-[0.65rem] uppercase tracking-widest text-papier/50 border border-ligne rounded-full px-2.5 py-1">
            {conte.genre}
          </span>
        )}
      </div>
      <h1 className="font-display text-4xl md:text-5xl text-papier mt-4 mb-2 leading-tight">{conte.titre}</h1>
      {conte.auteur && <p className="text-papier/40 font-mono text-sm mb-4">{conte.auteur}</p>}

      {conte.description && <p className="text-papier/60 leading-relaxed mb-6">{conte.description}</p>}

      <div className="mb-8">
        <BadgeTransparence generePar={conte.genere_par_ia} verifiePar={conte.verifie_par} />
      </div>

      <LecteurConte
        url={conte.fichier_url}
        slug={conte.slug}
        contenuId={conte.id}
        contenuInitial={conte.contenu_extrait || null}
        sectionInitiale={sectionInitiale}
        baseApi="/api/contes-africains"
        tableProgression="lecture_progress_contes_africains"
        colonneId="conte_id"
      />
    </div>
  )
}
