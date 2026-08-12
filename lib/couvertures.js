// Dégradés générés automatiquement pour chaque couverture — cohérents avec la charte (bleu / charbon).
// Extrait de app/page.js pour être réutilisable ailleurs (ex. carte de compte à rebours "Première").
export const DEGRADES = [
  ['#1c9bf0', '#0b3a6b', '#050b16'],
  ['#3ab0ff', '#0d3050', '#08101c'],
  ['#0d6fc4', '#0a2540', '#050a12'],
  ['#4fb3ff', '#0a2c52', '#060c16'],
  ['#1584dd', '#0e2038', '#070d16'],
]

export function degradeDe(id) {
  const n = (id || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return DEGRADES[n % DEGRADES.length]
}
