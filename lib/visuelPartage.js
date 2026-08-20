// Génère, entièrement côté client (canvas), un visuel de partage prêt pour Instagram/Facebook :
// couverture réelle en fond (ou dégradé de la section si absente), titre et genre incrustés dans
// l'image, et la mention d'appel à l'action — pas juste un lien texte à côté, tout est DANS le
// visuel téléchargé.

const LARGEUR = 1080
const HAUTEUR = 1350 // 4:5, format portrait Instagram

const PALETTES = {
  roman: { debut: '#1a2230', fin: '#0d0f12', accent: '#4a9eda' },
  livre: { debut: '#262a30', fin: '#0d0f12', accent: '#4a9eda' },
  'conte-africain': { debut: '#7a3b1e', fin: '#241009', accent: '#e69742' },
  'conte-enfant': { debut: '#5b3a9e', fin: '#1f1440', accent: '#ffd166' },
}

function envelopperTexte(ctx, texte, maxLargeur) {
  const mots = texte.split(' ')
  const lignes = []
  let ligne = ''
  for (const mot of mots) {
    const essai = ligne ? `${ligne} ${mot}` : mot
    if (ctx.measureText(essai).width > maxLargeur && ligne) {
      lignes.push(ligne)
      ligne = mot
    } else {
      ligne = essai
    }
  }
  if (ligne) lignes.push(ligne)
  return lignes
}

function chargerImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

// dessine `img` en mode "cover" (recadré, jamais déformé) sur tout le canvas
function dessinerCouvertureCover(ctx, img) {
  const ratioImg = img.width / img.height
  const ratioCanvas = LARGEUR / HAUTEUR
  let sw = img.width, sh = img.height, sx = 0, sy = 0
  if (ratioImg > ratioCanvas) {
    sw = img.height * ratioCanvas
    sx = (img.width - sw) / 2
  } else {
    sh = img.width / ratioCanvas
    sy = (img.height - sh) / 2
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, LARGEUR, HAUTEUR)
}

export async function genererVisuelPartage(canvas, { type, titre, genre, couvertureUrl, chapitreLabel }) {
  canvas.width = LARGEUR
  canvas.height = HAUTEUR
  const ctx = canvas.getContext('2d')
  const palette = PALETTES[type] || PALETTES.roman

  // Fond : couverture réelle si dispo, sinon dégradé de section
  let aDessineImage = false
  if (couvertureUrl) {
    try {
      const img = await chargerImage(couvertureUrl)
      dessinerCouvertureCover(ctx, img)
      aDessineImage = true
    } catch {
      // image indisponible (CORS, réseau...) → repli sur le dégradé, sans bloquer la génération
    }
  }
  if (!aDessineImage) {
    const degrade = ctx.createLinearGradient(0, 0, LARGEUR * 0.6, HAUTEUR)
    degrade.addColorStop(0, palette.debut)
    degrade.addColorStop(1, palette.fin)
    ctx.fillStyle = degrade
    ctx.fillRect(0, 0, LARGEUR, HAUTEUR)
  }

  // Voile sombre en bas pour la lisibilité du texte (toujours, même sans image)
  const voile = ctx.createLinearGradient(0, HAUTEUR * 0.35, 0, HAUTEUR)
  voile.addColorStop(0, 'rgba(13,15,18,0)')
  voile.addColorStop(1, 'rgba(13,15,18,0.94)')
  ctx.fillStyle = voile
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR)

  // Wordmark "ENCRE" en haut
  ctx.fillStyle = 'rgba(245,245,240,0.85)'
  ctx.font = '600 34px Georgia, serif'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('Encre', 60, 90)

  let y = HAUTEUR - 300

  // Badge chapitre/page (romans/livres/contes longs)
  if (chapitreLabel) {
    const labelCourt = chapitreLabel.length > 40 ? chapitreLabel.slice(0, 39).trim() + '…' : chapitreLabel
    ctx.font = '700 26px Arial, sans-serif'
    const largeurTexte = Math.min(ctx.measureText(labelCourt.toUpperCase()).width, LARGEUR - 120)
    ctx.fillStyle = palette.accent
    ctx.fillRect(60, y, largeurTexte + 32, 44)
    ctx.fillStyle = '#0d0f12'
    ctx.fillText(labelCourt.toUpperCase(), 76, y + 30, LARGEUR - 152)
    y += 70
  }

  // Badge genre
  if (genre) {
    ctx.font = '600 24px Arial, sans-serif'
    const largeurTexte = ctx.measureText(genre).width
    ctx.strokeStyle = 'rgba(245,245,240,0.5)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(60, y, largeurTexte + 32, 42)
    ctx.fillStyle = 'rgba(245,245,240,0.85)'
    ctx.fillText(genre, 76, y + 29)
    y += 70
  }

  // Titre, en gras, replié sur plusieurs lignes
  ctx.fillStyle = '#f5f5f0'
  ctx.font = '700 62px Georgia, serif'
  const lignesTitre = envelopperTexte(ctx, titre, LARGEUR - 120)
  for (const ligne of lignesTitre.slice(0, 4)) {
    y += 66
    ctx.fillText(ligne, 60, y)
  }

  // Appel à l'action, incrusté dans le visuel
  ctx.font = '500 28px Arial, sans-serif'
  ctx.fillStyle = palette.accent
  ctx.fillText('Découvre la suite sur Encre', 60, HAUTEUR - 60)
  ctx.font = '400 24px Arial, sans-serif'
  ctx.fillStyle = 'rgba(245,245,240,0.7)'
  ctx.fillText('Lien dans la bio', 60, HAUTEUR - 28)

  return canvas
}

export function telechargerCanvas(canvas, nomFichier) {
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nomFichier
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/jpeg', 0.92)
}

// Visuel "citation" : le lecteur sélectionne un passage qui l'a marqué, on l'incruste tel quel
// (jamais tronqué pour un extrait choisi par le lecteur lui-même) avec une belle mise en page,
// l'attribution et l'appel à l'action — contrairement au visuel titre/chapitre, celui-ci PORTE
// volontairement du texte du livre, puisque c'est précisément ce que le lecteur veut partager.
export async function genererVisuelCitation(canvas, { type, titre, texte, couvertureUrl }) {
  canvas.width = LARGEUR
  canvas.height = HAUTEUR
  const ctx = canvas.getContext('2d')
  const palette = PALETTES[type] || PALETTES.roman

  // Fond : couverture réelle assombrie (lisibilité avant tout, ici le texte occupe l'essentiel
  // de l'image) sinon dégradé de section
  let aDessineImage = false
  if (couvertureUrl) {
    try {
      const img = await chargerImage(couvertureUrl)
      dessinerCouvertureCover(ctx, img)
      aDessineImage = true
    } catch {
      // repli silencieux sur le dégradé
    }
  }
  if (!aDessineImage) {
    const degrade = ctx.createLinearGradient(0, 0, LARGEUR, HAUTEUR)
    degrade.addColorStop(0, palette.debut)
    degrade.addColorStop(1, palette.fin)
    ctx.fillStyle = degrade
    ctx.fillRect(0, 0, LARGEUR, HAUTEUR)
  }
  // Voile sombre sur toute l'image (texte prioritaire sur le visuel de fond)
  ctx.fillStyle = 'rgba(13,15,18,0.72)'
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR)

  ctx.fillStyle = 'rgba(245,245,240,0.7)'
  ctx.font = '600 30px Georgia, serif'
  ctx.fillText('Encre', 60, 90)

  // Taille de police adaptée à la longueur de l'extrait, pour que tout tienne sans déborder
  const extrait = texte.length > 500 ? texte.slice(0, 499).trim() + '…' : texte
  const taille = extrait.length <= 120 ? 54 : extrait.length <= 250 ? 44 : extrait.length <= 400 ? 36 : 30
  const interligne = Math.round(taille * 1.28)

  ctx.fillStyle = '#f5f5f0'
  ctx.font = `italic 700 ${taille}px Georgia, serif`
  const maxLargeur = LARGEUR - 160
  const lignes = envelopperTexte(ctx, `“${extrait}”`, maxLargeur)

  const hauteurBloc = lignes.length * interligne
  let y = (HAUTEUR - hauteurBloc) / 2
  for (const ligne of lignes) {
    ctx.fillText(ligne, 80, y)
    y += interligne
  }

  ctx.font = '500 26px Arial, sans-serif'
  ctx.fillStyle = palette.accent
  ctx.fillText(`— ${titre}`, 80, y + 40)

  ctx.font = '500 26px Arial, sans-serif'
  ctx.fillStyle = palette.accent
  ctx.fillText('Découvre la suite sur Encre', 60, HAUTEUR - 60)
  ctx.font = '400 22px Arial, sans-serif'
  ctx.fillStyle = 'rgba(245,245,240,0.7)'
  ctx.fillText('Lien dans la bio', 60, HAUTEUR - 28)

  return canvas
}
