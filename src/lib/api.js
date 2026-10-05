import { authFetch } from './supabase';

export const BACKEND_URL = 'https://r2-forms-backend.onrender.com';

async function jsonOrThrow(res, fallback) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.message || fallback);
    e.code = data.error || null;
    e.data = data;
    throw e;
  }
  return data;
}

function postAuth(path, body) {
  return authFetch(BACKEND_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
}

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

// --- Commandes (paiement Gumroad) -------------------------------------------------------
// Le serveur decide seul du prix et de la gratuite (premiere generation du compte offerte,
// quelle que soit la taille) — le client ne fait qu'afficher ce qu'il renvoie.
// kind: 'generation' (5 $, avant l'analyse) | 'supplement' (5 $ de plus, apres une analyse
// de plus de 100 questions, avec analysisId) | 'redeploy' | 'translation'.
// Reponse : { orderId, free, amountUsd, checkoutUrl }.
export async function createOrder(kind, extra) {
  const res = await postAuth('/api/orders', Object.assign({ kind }, extra));
  return jsonOrThrow(res, 'Erreur de commande');
}

// { status: 'pending' | 'paid' | 'used' | 'refunded' }
export async function getOrder(orderId) {
  const res = await authFetch(BACKEND_URL + '/api/orders/' + encodeURIComponent(orderId));
  return jsonOrThrow(res, 'Erreur de commande');
}

function mapAnalysis(data) {
  return {
    status: data.status || 'ready', // 'ready' | 'supplement_required'
    analysisId: data.analysis_id || null,
    title: data.title,
    xlsform: data.xlsform,
    media: data.media_associations || [],
    questionCount: data.question_count || 0,
  };
}

// Consomme une commande payee (ou gratuite). Si le questionnaire depasse 100 questions et
// que la commande n'etait pas gratuite, le serveur renvoie status 'supplement_required'
// SANS le xlsform : il ne sera libere qu'apres paiement du complement (releaseAnalysis).
export async function analyseQuestionnaire(payload, tool, orderId) {
  const res = await postAuth('/api/analyse', Object.assign({ tool, orderId }, payload));
  return mapAnalysis(await jsonOrThrow(res, 'Erreur analyse'));
}

export async function releaseAnalysis(analysisId, orderId) {
  const res = await postAuth('/api/analyse/release', { analysisId, orderId });
  return mapAnalysis(await jsonOrThrow(res, 'Erreur analyse'));
}

// Traduit un xlsform deja paye (nouvelle ligne "analyses" liee via sourceAnalysisId).
export async function translateXlsform({ xlsform, targetLang, targetLangCode, titre, sourceAnalysisId, outil, orderId }) {
  const res = await postAuth('/api/translate-xlsform', { xlsform, targetLang, targetLangCode, titre, sourceAnalysisId, outil, orderId });
  return jsonOrThrow(res, 'Erreur traduction'); // { xlsform, analysis_id }
}


// --- Deploiement vers l'outil cible ------------------------------------------------------
export async function deployToKobo({ xlsform, title, media }, { username, password, server }) {
  const res = await fetch(BACKEND_URL + '/api/deploy/kobo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xlsform, title, credentials: { username, password, server: server || 'https://kf.kobotoolbox.org' }, media: media || [] }),
  });
  const data = await jsonOrThrow(res, 'Erreur déploiement');
  return { uid: data.uid, url: data.url };
}

export async function deployToJotForm({ xlsform, title }, { apiKey }) {
  const res = await fetch(BACKEND_URL + '/api/deploy/jotform', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xlsform, title, credentials: { apiKey } }),
  });
  const data = await jsonOrThrow(res, 'Erreur déploiement JotForm');
  return { uid: data.formId, url: data.url };
}

export async function deployToGoogle({ xlsform, title }, { accessToken }) {
  const res = await fetch(BACKEND_URL + '/api/deploy/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xlsform, title, credentials: { accessToken } }),
  });
  const data = await jsonOrThrow(res, 'Erreur déploiement Google Forms');
  return { uid: data.formId, url: data.url };
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

// Deploie un xlsform deja libere vers l'outil choisi. Renvoie { url, uid } (url null pour
// Excel/XLSForm telecharges localement).
export async function deployForm(tool, form, credentials) {
  if (tool === 'excel') {
    const { blob, filename } = await deployToExcel(form);
    triggerBlobDownload(blob, filename);
    return { url: null, uid: null };
  }
  if (tool === 'jotform') return deployToJotForm(form, { apiKey: credentials.apiKey });
  if (tool === 'google') return deployToGoogle(form, { accessToken: credentials.googleAccessToken });
  return deployToKobo(form, credentials);
}
