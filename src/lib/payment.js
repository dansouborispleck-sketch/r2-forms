import { initiateFedaPay, verifyFedaPay, initiateKora, verifyKora } from './api';

// Lance une popup de paiement puis sonde /api/payment/verify (ou son equivalent Kora)
// toutes les 5s jusqu'a approbation/refus. Le credit est APPLIQUE cote SERVEUR (montant
// reel du prestataire, jamais la valeur locale "credits") — cette fonction se contente de
// rafraichir l'affichage une fois l'evenement recu. stopStatuses: valeurs de
// verifyData.status qui arretent le sondage sans succes (different par prestataire).
function pollPayment({ popup, verify, stopStatuses, timeoutMs, onApproved, onDeclined }) {
  const interval = setInterval(async () => {
    try {
      const verifyData = await verify();
      if (verifyData.approved) {
        clearInterval(interval);
        if (popup && !popup.closed) popup.close();
        onApproved(verifyData);
      } else if (stopStatuses.includes(verifyData.status)) {
        clearInterval(interval);
        if (popup && !popup.closed) popup.close();
        onDeclined();
      }
    } catch (e) {
      console.error('[RECHARGE] Erreur:', e);
    }
  }, 5000);
  if (timeoutMs) setTimeout(() => clearInterval(interval), timeoutMs);
  return interval;
}

export async function lancerPaiementRecharge(prix, credits, { email, accessToken, showToast, onCredited }) {
  try {
    const data = await initiateFedaPay(prix, email);
    const popup = window.open(data.checkoutUrl || data.token, 'fedapay-recharge', 'width=520,height=700,scrollbars=yes');
    showToast('⏳ En attente du paiement...');
    pollPayment({
      popup,
      verify: () => verifyFedaPay(data.transactionId),
      stopStatuses: ['declined'],
      onApproved: async (verifyData) => {
        if (verifyData.crediteApplique) {
          await onCredited();
          showToast('✅ Solde rechargé : +' + credits.toLocaleString('fr-FR') + ' FCFA');
        } else {
          showToast('⚠️ Paiement confirmé mais crédit non appliqué. Contactez le support.');
        }
      },
      onDeclined: () => showToast('❌ Paiement refusé. Réessayez.'),
    });
  } catch (e) {
    showToast('❌ Erreur : ' + e.message);
  }
}

export async function lancerPaiementRechargeKora(montantFcfa, credits, currency, { email, accessToken, showToast, onCredited }) {
  try {
    const data = await initiateKora(montantFcfa, currency, email);
    const popup = window.open(data.link, 'kora-recharge', 'width=520,height=700,scrollbars=yes');
    showToast('⏳ En attente du paiement (' + (data.targetAmount || '').toLocaleString('fr-FR') + ' ' + (data.targetCurrency || currency) + ')...');
    pollPayment({
      popup,
      verify: () => verifyKora(data.txRef),
      stopStatuses: ['failed', 'cancelled'],
      timeoutMs: 900000, // 15 minutes — le parcours Kora (page complete) peut prendre plus de temps qu'un simple popup Mobile Money.
      onApproved: async (verifyData) => {
        if (verifyData.crediteApplique) {
          await onCredited();
          showToast('✅ Solde rechargé : +' + credits.toLocaleString('fr-FR') + ' FCFA');
        } else {
          showToast('⚠️ Paiement confirmé mais crédit non appliqué. Contactez le support.');
        }
      },
      onDeclined: () => showToast('❌ Paiement refusé. Réessayez.'),
    });
  } catch (e) {
    showToast('❌ Erreur : ' + e.message);
  }
}
