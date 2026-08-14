import { kkiapay } from '@kkiapay-org/nodejs-sdk'

// Client serveur KKiaPay. À utiliser UNIQUEMENT dans des routes API (jamais côté navigateur) —
// il embarque la clé privée, qui permet de vérifier des transactions sur le compte.
function client() {
  return kkiapay({
    publickey: process.env.KKIAPAY_PUBLIC_KEY,
    privatekey: process.env.KKIAPAY_PRIVATE_KEY,
    secretkey: process.env.KKIAPAY_SECRET_KEY,
    sandbox: process.env.KKIAPAY_SANDBOX === 'true',
  })
}

// Vérifie une transaction directement auprès de KKiaPay (jamais faire confiance au montant/statut
// renvoyé par le navigateur ou par le corps du webhook sans cette vérification serveur-à-serveur).
// Retourne { reussi, montant, statutBrut } ou lève une erreur si l'appel échoue.
export async function verifierTransaction(transactionId) {
  const reponse = await client().verify(transactionId)

  // Selon les versions du SDK la clé peut être `status` ou `isSuccessful` — on couvre les deux.
  const statutBrut = reponse?.status || reponse?.data?.status
  const reussi = statutBrut === 'SUCCESS' || reponse?.isSuccessful === true

  return {
    reussi,
    montant: Number(reponse?.amount ?? reponse?.data?.amount ?? 0),
    statutBrut,
    brut: reponse,
  }
}
