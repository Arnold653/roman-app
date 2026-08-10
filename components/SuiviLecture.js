'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// Composant invisible : enregistre que l'utilisateur connecté a lu ce chapitre.
export default function SuiviLecture({ romanId, numeroChapitre }) {
  const supabase = createClient()

  useEffect(() => {
    async function enregistrer() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: existant } = await supabase
        .from('lecture_progress')
        .select('dernier_chapitre')
        .eq('user_id', user.id)
        .eq('roman_id', romanId)
        .maybeSingle()

      if (!existant || numeroChapitre > existant.dernier_chapitre) {
        await supabase.from('lecture_progress').upsert({
          user_id: user.id,
          roman_id: romanId,
          dernier_chapitre: numeroChapitre,
          updated_at: new Date().toISOString(),
        })
      }
    }
    enregistrer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [romanId, numeroChapitre])

  return null
}
