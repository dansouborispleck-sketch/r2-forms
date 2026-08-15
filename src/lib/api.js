import { authFetch } from './supabase';

export const BACKEND_URL = 'https://r2-forms-backend.onrender.com';

// Envoie le fichier au backend pour extraction du texte (PDF lu nativement par Claude a
// l'analyse -> le backend renvoie alors pdfBase64 plutot qu'un texte extrait).
export async function importFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(BACKEND_URL + '/api/import', { method: 'POST', body: formData });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || 'Erreur de lecture');
    err.data = data;
    throw err;
  }
  return data;
}

// Route payante : exige une connexion (jeton Supabase), facturee de maniere fiable cote
// serveur (verification de solde puis debit atomique APRES succes de l'analyse) — plus de
// debit client separe et evitable.
export async function analyseQuestionnaire(payload, tool) {
  const res = await authFetch(BACKEND_URL + '/api/analyse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ tool }, payload)),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erreur serveur' }));
    const e = new Error(err.message || 'Erreur analyse');
    e.code = err.error;
    e.pendingAnalysisId = err.pendingAnalysisId || null;
    e.tarifReel = err.tarifReel || null;
    throw e;
  }
  const data = await res.json();
  return {
    title: data.title,
    xlsform: data.xlsform,
    needsReview: data.needs_review || [],
    coherenceReport: data.coherence_report || [],
    media: data.media_associations || [],
    tarif: data.tarif,
    analysisId: data.analysis_id || null,
    warning: data.warning || null,
    missingChoicesCount: data.missing_choices_count || 0,
  };
}

// Refacture une analyse deja calculee (xlsform deja produit par un appel Claude reussi)
// mais mise en attente cote serveur faute de solde suffisant au tarif reel — AUCUN nouvel
// appel Claude, juste un nouveau debit tente sur le meme resultat. A utiliser apres une
// recharge, en remplacement d'un nouvel appel a analyseQuestionnaire (qui relancerait
// l'analyse depuis zero, payant deux fois le meme appel Claude pour un seul resultat livre).
export async function retryAnalysisBilling(pendingAnalysisId) {
  const res = await authFetch(BACKEND_URL + '/api/analyse/retry-billing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pendingAnalysisId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erreur serveur' }));
    const e = new Error(err.message || 'Erreur de facturation');
    e.code = err.error;
    e.pendingAnalysisId = err.pendingAnalysisId || null;
    e.tarifReel = err.tarifReel || null;
    throw e;
  }
  const data = await res.json();
  return {
    title: data.title,
    xlsform: data.xlsform,
    needsReview: data.needs_review || [],
    coherenceReport: data.coherence_report || [],
    media: data.media_associations || [],
    tarif: data.tarif,
    analysisId: data.analysis_id || null,
    warning: data.warning || null,
    missingChoicesCount: data.missing_choices_count || 0,
  };
}

export async function deployToKobo({ xlsform, title, media }, { username, password, server }) {
  const res = await fetch(BACKEND_URL + '/api/deploy/kobo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xlsform, title, credentials: { username, password, server: server || 'https://kf.kobotoolbox.org' }, media: media || [] }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erreur déploiement' }));
    throw new Error(err.message || 'Erreur déploiement');
  }
  const data = await res.json();
  return { uid: data.uid, url: data.url, mediaAssociated: data.mediaAssociated || 0 };
}

export async function deployToJotForm({ xlsform, title }, { apiKey }) {
  const res = await fetch(BACKEND_URL + '/api/deploy/jotform', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xlsform, title, credentials: { apiKey } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Erreur déploiement JotForm');
  return { uid: data.formId, url: data.url, note: data.note || null, repeatsFlattened: data.repeatsFlattened || 0 };
}

export async function deployToGoogle({ xlsform, title }, { accessToken }) {
  const res = await fetch(BACKEND_URL + '/api/deploy/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xlsform, title, credentials: { accessToken } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Erreur déploiement Google Forms');
  return { uid: data.formId, url: data.url, repeatsFlattened: data.repeatsFlattened || 0 };
}

export async function deployToExcel({ xlsform, title }) {
  const res = await fetch(BACKEND_URL + '/api/deploy/excel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xlsform, title }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.message || 'Erreur génération Excel');
  }
  const blob = await res.blob();
  const filename = (title || 'formulaire').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) + '_masque.xlsx';
  return { blob, filename };
}

export async function downloadImagesZip(images, title) {
  const res = await fetch(BACKEND_URL + '/api/download-images-zip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images, title }),
  });
  if (!res.ok) throw new Error('Erreur ZIP');
  const blob = await res.blob();
  return { blob, filename: (title || 'formulaire').replace(/[^a-zA-Z0-9_-]/g, '_') + '_images.zip' };
}

export async function translateXlsform({ xlsform, targetLang, targetLangCode, titre, sourceAnalysisId, outil }) {
  const res = await authFetch(BACKEND_URL + '/api/translate-xlsform', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xlsform, targetLang, targetLangCode, titre, sourceAnalysisId, outil }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Erreur traduction');
  }
  return res.json();
}

export async function redeployBill({ xlsform, targetTool, titre }) {
  const res = await authFetch(BACKEND_URL + '/api/redeploy-bill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xlsform, targetTool, titre }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Erreur facturation du redéploiement');
  }
  return res.json();
}

// authFetch (jeton Supabase) desormais requis: le serveur associe la transaction a
// l'utilisateur connecte des l'initiation, pour que /verify credite le bon compte plus
// tard, quel que soit qui appelle /verify (voir server.js, pendingPayments).
export async function initiateFedaPay(prix, email) {
  const res = await authFetch(BACKEND_URL + '/api/payment/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: prix, description: 'TransQi Deploy - Recharge ' + prix.toLocaleString('fr-FR') + ' FCFA', customer: { email } }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) throw new Error(data.message || 'Erreur initialisation');
  return data; // { token, checkoutUrl, transactionId }
}

export async function verifyFedaPay(transactionId) {
  const res = await authFetch(BACKEND_URL + '/api/payment/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactionId }),
  });
  return res.json();
}

// authFetch requis pour la meme raison que initiateFedaPay ci-dessus.
export async function initiateKora(montantFcfa, currency, email) {
  const res = await authFetch(BACKEND_URL + '/api/payment/kora/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ montantFcfa, currency, customer: { email } }),
  });
  const data = await res.json();
  if (!res.ok || !data.link) throw new Error(data.message || 'Erreur initialisation');
  return data; // { link, txRef, targetAmount, targetCurrency }
}

export async function verifyKora(txRef) {
  const res = await authFetch(BACKEND_URL + '/api/payment/kora/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txRef }),
  });
  return res.json();
}

export function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
