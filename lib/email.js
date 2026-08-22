// Envoi d'email transactionnel via l'API Resend (https://resend.com) — choisi pour sa simplicité
// (un fetch suffit, pas de SDK à ajouter) et son offre gratuite généreuse (3000 emails/mois).
// N'échoue jamais bruyamment : si la clé n'est pas configurée ou que l'envoi rate, on ignore
// silencieusement plutôt que de casser le flux (publication d'un chapitre, inscription...) qui
// a déclenché l'email — exactement le même principe que lib/push.js pour les notifications push.

const DEPUIS = process.env.RESEND_FROM || 'Encre <onboarding@resend.dev>'

export async function envoyerEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY || !to) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: DEPUIS, to, subject, html }),
    })
  } catch {
    // silencieux — voir commentaire en tête de fichier
  }
}

// Gabarit commun aux emails transactionnels : sobre, thème sombre cohérent avec l'app, un seul
// bouton d'action. Les clients email ignorent souvent le CSS avancé, donc tout est en styles
// inline avec des couleurs qui restent lisibles même si le fond n'est pas respecté.
function gabarit({ titre, corps, lienBouton, texteBouton }) {
  return `
<div style="background:#0d0f12;padding:40px 20px;font-family:Georgia,serif;">
  <div style="max-width:480px;margin:0 auto;background:#171a1e;border-radius:12px;padding:32px;border:1px solid #2a2d31;">
    <p style="color:#e0a94f;font-family:Georgia,serif;font-size:22px;font-weight:600;margin:0 0 24px;">Encre</p>
    <h1 style="color:#f5f5f0;font-size:22px;margin:0 0 16px;">${titre}</h1>
    <p style="color:#c8c8c2;font-size:15px;line-height:1.6;margin:0 0 28px;">${corps}</p>
    ${lienBouton ? `<a href="${lienBouton}" style="display:inline-block;background:#e0a94f;color:#0d0f12;text-decoration:none;font-family:Arial,sans-serif;font-weight:600;font-size:14px;padding:12px 24px;border-radius:24px;">${texteBouton}</a>` : ''}
  </div>
  <p style="color:#5a5d61;font-family:Arial,sans-serif;font-size:12px;text-align:center;margin-top:20px;">Encre — romans, livres, contes & histoires, à lire ou à écouter.</p>
</div>`
}

export async function envoyerEmailNouveauChapitre({ to, romanTitre, numero, lien }) {
  await envoyerEmail({
    to,
    subject: `${romanTitre} — nouveau chapitre disponible`,
    html: gabarit({
      titre: `Le chapitre ${numero} vient de sortir`,
      corps: `« ${romanTitre} » a un nouveau chapitre à lire dès maintenant sur Encre.`,
      lienBouton: lien,
      texteBouton: 'Lire le chapitre',
    }),
  })
}

export async function envoyerEmailBienvenue({ to, pseudo }) {
  await envoyerEmail({
    to,
    subject: 'Bienvenue sur Encre',
    html: gabarit({
      titre: `Bienvenue, ${pseudo}`,
      corps: `Ton compte est prêt. Romans, livres, contes et histoires — une nouvelle histoire chaque semaine, à lire et à discuter en communauté.`,
      lienBouton: process.env.NEXT_PUBLIC_SITE_URL || 'https://app.encres.vercel.app',
      texteBouton: 'Découvrir Encre',
    }),
  })
}

const LABEL_PAR_TYPE = { livre: 'Nouveau livre', 'conte-africain': 'Nouveau conte', 'conte-enfant': 'Nouvelle histoire' }
const VERBE_PAR_TYPE = { livre: 'à lire', 'conte-africain': 'à lire (et à écouter)', 'conte-enfant': 'à lire en famille' }

// Livres et Contes n'ont pas de lecteurs déjà engagés au moment de la publication (contrairement
// aux Romans, notifiés chapitre par chapitre à ceux qui suivent déjà une progression) — l'annonce
// part donc à toute la base de lecteurs, une seule fois par titre (voir email_annonce_envoye).
export async function envoyerEmailNouveauTitre({ type, titre, lien, destinataires }) {
  const html = gabarit({
    titre: `${LABEL_PAR_TYPE[type]} sur Encre`,
    corps: `« ${titre} » vient d'être publié, ${VERBE_PAR_TYPE[type]} dès maintenant sur Encre.`,
    lienBouton: lien,
    texteBouton: 'Découvrir',
  })
  await Promise.all(destinataires.map((to) => envoyerEmail({ to, subject: `${LABEL_PAR_TYPE[type]} : ${titre}`, html })))
}

// Tous les emails de la base (jusqu'à 1000 comptes — largement suffisant pour l'instant ;
// à revoir avec une vraie pagination si la base grandit beaucoup plus que ça).
export async function tousLesEmails(admin) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 })
  return (data?.users ?? []).map((u) => u.email).filter(Boolean)
}
