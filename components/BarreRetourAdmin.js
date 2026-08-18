// Barre discrète affichée en haut d'une fiche de lecture quand elle est ouverte
// depuis le bouton "Aperçu" de l'admin (lien avec ?admin=1), pour pouvoir revenir
// sans dépendre du bouton retour du navigateur (peu fiable dans certains navigateurs
// intégrés mobiles).
export default function BarreRetourAdmin({ href }) {
  return (
    <a
      href={href}
      className="flex items-center gap-2 text-xs font-mono uppercase tracking-wide text-papier/40 hover:text-or transition-colors mb-6"
    >
      ← Retour à l'admin
    </a>
  )
}
