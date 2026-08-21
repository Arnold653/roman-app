// Enregistre discrètement que l'utilisateur a lu quelque chose aujourd'hui — sert uniquement
// à calculer la série de lecture (streak). Best-effort : une erreur ici ne doit jamais empêcher
// l'affichage de la page de lecture elle-même.
export async function enregistrerActiviteLecture(admin, userId) {
  if (!userId) return
  try {
    const jour = new Date().toISOString().slice(0, 10)
    await admin.from('activite_lecture').upsert({ user_id: userId, jour }, { onConflict: 'user_id,jour', ignoreDuplicates: true })
  } catch {
    // silencieux : ne jamais casser une page de lecture pour une stat annexe
  }
}

// Calcule la série de jours consécutifs (jusqu'à aujourd'hui ou hier — pour ne pas casser la
// série tant que le lecteur n'a pas encore rouvert l'app aujourd'hui) à partir des jours lus.
export function calculerSerie(jours) {
  const ensemble = new Set(jours)
  const aujourdHui = new Date()
  aujourdHui.setHours(0, 0, 0, 0)

  let depart = new Date(aujourdHui)
  const cle = (d) => d.toISOString().slice(0, 10)
  if (!ensemble.has(cle(depart))) {
    depart.setDate(depart.getDate() - 1)
    if (!ensemble.has(cle(depart))) return 0
  }

  let serie = 0
  const curseur = new Date(depart)
  while (ensemble.has(cle(curseur))) {
    serie++
    curseur.setDate(curseur.getDate() - 1)
  }
  return serie
}
