import { createOrder, getOrder } from './api';

// Paiement Gumroad (carte bancaire). Le serveur cree la commande et renvoie l'URL de
// checkout du produit Gumroad, avec order_id en parametre d'URL : Gumroad le renvoie tel
// quel dans son "Ping" (webhook) au serveur, qui marque alors la commande payee. Le client
// se contente de sonder l'etat de la commande — il ne decide jamais lui-meme qu'un
// paiement a abouti.
//
// La fenetre de paiement est ouverte de facon SYNCHRONE au clic (openCheckoutWindow) puis
// redirigee une fois la commande creee : ouverte apres un await, elle serait bloquee par
// les navigateurs (surtout sur mobile).
export function openCheckoutWindow() {
  return window.open('about:blank', 'transqi-checkout');
}

const POLL_MS = 3000;
const TIMEOUT_MS = 20 * 60 * 1000;

// Renvoie l'orderId une fois paye (ou immediatement si la commande est gratuite).
// onAwaiting(checkoutUrl) : appele quand le client doit payer (pour afficher un lien de
// reouverture si la fenetre a ete fermee ou bloquee). signal : AbortSignal pour annuler.
export async function payOrder(kind, extra, { checkoutWindow, onAwaiting, signal }) {
  let order;
  try {
    order = await createOrder(kind, extra);
  } catch (e) {
    if (checkoutWindow && !checkoutWindow.closed) checkoutWindow.close();
    throw e;
  }
  if (order.free) {
    if (checkoutWindow && !checkoutWindow.closed) checkoutWindow.close();
    return order.orderId;
  }
  if (checkoutWindow && !checkoutWindow.closed) checkoutWindow.location.href = order.checkoutUrl;
  else window.open(order.checkoutUrl, 'transqi-checkout');
  onAwaiting?.(order.checkoutUrl, order.amountUsd);

  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    if (signal?.aborted) throw Object.assign(new Error('cancelled'), { code: 'CANCELLED' });
    try {
      const { status } = await getOrder(order.orderId);
      if (status === 'paid') {
        if (checkoutWindow && !checkoutWindow.closed) checkoutWindow.close();
        return order.orderId;
      }
      if (status === 'refunded') throw Object.assign(new Error('refunded'), { code: 'PAYMENT_FAILED' });
    } catch (e) {
      if (e.code === 'PAYMENT_FAILED') throw e;
      // erreur reseau ponctuelle : on continue de sonder
    }
  }
  throw Object.assign(new Error('timeout'), { code: 'PAYMENT_TIMEOUT' });
}
