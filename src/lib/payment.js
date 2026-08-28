import { initiateFedaPay, verifyFedaPay, initiateKora, verifyKora } from './api';

// Lance une popup de paiement puis sonde /api/payment/verify (ou son equivalent Kora)
// toutes les 5s jusqu'a approbation/refus. Le credit est APPLIQUE cote SERVEUR (montant
// reel du prestataire, jamais la valeur locale "credits") — cette fonction se contente de
// rafraichir l'affichage une fois l'evenement recu. stopStatuses: valeurs de
// verifyData.status qui arretent le sondage sans succes (different par prestataire).
//
// Une fois le paiement approuve, crediteApplique peut rester faux un instant (ecriture
// Supabase transitoire, cf server.js) — au lieu d'abandonner des le premier sondage
// "approuve", on continue de sonder pendant creditRetryMs (le serveur retente le credit a
// chaque appel) avant de renoncer et d'afficher le message de support.
function pollPayment({ popup, verify, stopStatuses, timeoutMs, creditRetryMs, onCredited, onPendingCredit, onDeclined, onCreditTimeout }) {
  let settled = false;
  let creditDeadline = null;
  const interval = setInterval(async () => {
    if (settled) return;
    try {
      const verifyData = await verify();
      if (verifyData.approved && verifyData.crediteApplique) {
        settled = true;
        clearInterval(interval);
        if (popup && !popup.closed) popup.close();
        onCredited(verifyData);
      } else if (verifyData.approved) {
        if (creditDeadline === null) creditDeadline = Date.now() + (creditRetryMs || 60000);
        if (Date.now() >= creditDeadline) {
          settled = true;
          clearInterval(interval);
          if (popup && !popup.closed) popup.close();
          onCreditTimeout();
        } else if (onPendingCredit) {
          onPendingCredit();
        }
      } else if (stopStatuses.includes(verifyData.status)) {
        settled = true;
        clearInterval(interval);
        if (popup && !popup.closed) popup.close();
        onDeclined();
      }
    } catch (e) {
      console.error('[RECHARGE] Erreur:', e);
    }
  }, 5000);
  if (timeoutMs) setTimeout(() => { if (!settled) { settled = true; clearInterval(interval); } }, timeoutMs);
  return interval;
}

// t: fonction de traduction (voir useLang) — passee par l'appelant (RechargeModal) car ce
// module n'est pas un composant React et ne peut pas utiliser le hook directement.
// Fallback identite (toujours francais) si aucun t n'est fourni, pour ne jamais planter
// un appelant qui l'oublierait.
const identityT = (fr) => fr;

export async function lancerPaiementRecharge(prix, credits, { email, accessToken, showToast, onCredited, t = identityT }) {
  try {
    const data = await initiateFedaPay(prix, email);
    const popup = window.open(data.checkoutUrl || data.token, 'fedapay-recharge', 'width=520,height=700,scrollbars=yes');
    showToast(t('⏳ En attente du paiement...', '⏳ Waiting for payment...'));
    let pendingToastShown = false;
    pollPayment({
      popup,
      verify: () => verifyFedaPay(data.transactionId),
      stopStatuses: ['declined'],
      onCredited: async () => {
        await onCredited();
        showToast(t('✅ Solde rechargé : +', '✅ Balance topped up: +') + credits.toLocaleString('fr-FR') + ' FCFA');
      },
      onPendingCredit: () => {
        if (!pendingToastShown) { pendingToastShown = true; showToast(t('⏳ Paiement confirmé, application du crédit...', '⏳ Payment confirmed, applying credit...')); }
      },
      onCreditTimeout: () => showToast(t('⚠️ Paiement confirmé mais crédit non appliqué. Contactez le support.', '⚠️ Payment confirmed but credit not applied. Please contact support.')),
      onDeclined: () => showToast(t('❌ Paiement refusé. Réessayez.', '❌ Payment declined. Please try again.')),
    });
  } catch (e) {
    showToast(t('❌ Erreur : ', '❌ Error: ') + e.message);
  }
}

export async function lancerPaiementRechargeKora(montantFcfa, credits, currency, { email, accessToken, showToast, onCredited, t = identityT }) {
  try {
    const data = await initiateKora(montantFcfa, currency, email);
    const popup = window.open(data.link, 'kora-recharge', 'width=520,height=700,scrollbars=yes');
    showToast(t('⏳ En attente du paiement (', '⏳ Waiting for payment (') + (data.targetAmount || '').toLocaleString('fr-FR') + ' ' + (data.targetCurrency || currency) + ')...');
    let pendingToastShown = false;
    pollPayment({
      popup,
      verify: () => verifyKora(data.txRef),
      stopStatuses: ['failed', 'cancelled'],
      timeoutMs: 900000, // 15 minutes — le parcours Kora (page complete) peut prendre plus de temps qu'un simple popup Mobile Money.
      onCredited: async () => {
        await onCredited();
        showToast(t('✅ Solde rechargé : +', '✅ Balance topped up: +') + credits.toLocaleString('fr-FR') + ' FCFA');
      },
      onPendingCredit: () => {
        if (!pendingToastShown) { pendingToastShown = true; showToast(t('⏳ Paiement confirmé, application du crédit...', '⏳ Payment confirmed, applying credit...')); }
      },
      onCreditTimeout: () => showToast(t('⚠️ Paiement confirmé mais crédit non appliqué. Contactez le support.', '⚠️ Payment confirmed but credit not applied. Please contact support.')),
      onDeclined: () => showToast(t('❌ Paiement refusé. Réessayez.', '❌ Payment declined. Please try again.')),
    });
  } catch (e) {
    showToast(t('❌ Erreur : ', '❌ Error: ') + e.message);
  }
}
