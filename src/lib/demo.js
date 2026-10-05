// Serveur SIMULE pour la demonstration (VITE_DEMO=true uniquement, jamais sur le vrai site).
// Intercepte les appels a Supabase et au serveur TransQi et repond comme le ferait le
// nouveau serveur : essai gratuit, commandes payees apres quelques secondes, complement
// au-dela de 100 questions, tickets de depot, historique.

const DEMO_USER = {
  id: 'demo-user', email: 'demo@transqi.com', email_confirmed_at: '2026-10-01T00:00:00Z',
  app_metadata: { provider: 'email' }, user_metadata: { full_name: 'Compte de démonstration' },
};
const PAYMENT_DELAY_MS = 5000;

function survey(n) {
  return Array.from({ length: n }, (_, i) => ({ type: 'text', name: 'q' + (i + 1), label: 'Question ' + (i + 1) }));
}

const state = {
  freeTrialUsed: false,
  orders: {},
  pending: {},
  analyses: [
    { id: 'an-1', titre: 'Enquête ménages Zou 2026', created_at: '2026-09-12T09:30:00Z', langue: 'fr', xlsform_json: { survey: survey(42) },
      deployments: [{ id: 'd1', outil: 'kobo', form_url: 'https://kf.kobotoolbox.org/', deployed_at: '2026-09-12T09:35:00Z' }] },
    { id: 'an-2', titre: 'Suivi nutritionnel des enfants', created_at: '2026-08-03T14:10:00Z', langue: 'fr', xlsform_json: { survey: survey(128) },
      deployments: [{ id: 'd2', outil: 'google', form_url: 'https://docs.google.com/forms', deployed_at: '2026-08-03T14:20:00Z' }] },
  ],
  payments: [
    { id: 'p1', created_at: '2026-09-12T09:29:00Z', description: 'Génération de formulaire', montant_usd: 5 },
    { id: 'p2', created_at: '2026-08-03T14:05:00Z', description: 'Génération de formulaire', montant_usd: 5 },
    { id: 'p3', created_at: '2026-08-03T14:08:00Z', description: 'Complément (plus de 100 questions)', montant_usd: 5 },
  ],
  tickets: {},
  seq: 0,
};

const id = (p) => p + '-' + (++state.seq) + '-' + Math.random().toString(36).slice(2, 7);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const realQuestions = (xlsform) => ((xlsform && xlsform.survey) || []).filter((r) => !['begin_group', 'end_group', 'note'].includes(r.type)).length;

function countQuestionsInText(text) {
  const lines = String(text || '').split('\n').map((l) => l.trim()).filter((l) => l.length > 2);
  return Math.max(3, lines.length);
}

function titleFromText(text) {
  const first = String(text || '').split('\n').map((l) => l.trim()).find((l) => l.length > 3) || 'Questionnaire';
  return first.replace(/^(Q\s?\d+[.):]?|\d+[.)])\s*/i, '').slice(0, 60);
}

function issueTicket(analysisId) {
  const t = id('ticket');
  state.tickets[t] = { analysisId, used: false };
  return t;
}

function deliver(analysis) {
  return { status: 'ready', analysis_id: analysis.id, title: analysis.titre, xlsform: analysis.xlsform_json, question_count: realQuestions(analysis.xlsform_json), deploy_ticket: issueTicket(analysis.id) };
}

async function readBody(init) {
  if (!init || !init.body || typeof init.body !== 'string') return {};
  try { return JSON.parse(init.body); } catch { return {}; }
}

async function supabase(path, method, init) {
  if (path.startsWith('/auth/v1/token')) {
    const body = await readBody(init);
    if (!body.email) return json({ error_description: 'Email requis' }, 400);
    return json({ access_token: 'demo-token', refresh_token: 'demo-refresh', user: { ...DEMO_USER, email: body.email } });
  }
  if (path.startsWith('/auth/v1/signup')) return json({ id: DEMO_USER.id });
  if (path.startsWith('/auth/v1/user')) return json(DEMO_USER);
  if (path.startsWith('/auth/v1/logout')) return json({});
  if (path.startsWith('/rest/v1/profiles')) return json([{ id: DEMO_USER.id, email: DEMO_USER.email, full_name: DEMO_USER.user_metadata.full_name, free_trial_used: state.freeTrialUsed, bonus_generations: 0 }]);
  if (path.startsWith('/rest/v1/analyses')) return json(state.analyses);
  if (path.startsWith('/rest/v1/transactions')) return json(state.payments);
  if (path.startsWith('/rest/v1/deployments') && method === 'POST') {
    const body = await readBody(init);
    const a = state.analyses.find((x) => x.id === body.analysis_id);
    if (a) a.deployments = [{ id: id('d'), outil: body.outil, form_url: body.form_url, deployed_at: new Date().toISOString() }, ...(a.deployments || [])];
    return json([body], 201);
  }
  return json([]);
}

function createOrder(kind, analysisId) {
  if (kind === 'generation' && !state.freeTrialUsed) {
    state.freeTrialUsed = true;
    const o = { id: id('order'), kind, status: 'paid', free: true, analysisId: null };
    state.orders[o.id] = o;
    return json({ orderId: o.id, free: true, amountUsd: 0, checkoutUrl: null });
  }
  let amount = 5;
  if (kind === 'translation' || kind === 'redeploy') {
    const a = state.analyses.find((x) => x.id === analysisId);
    amount = a && realQuestions(a.xlsform_json) > 100 ? 5 : 3;
  }
  const o = { id: id('order'), kind, status: 'pending', free: false, analysisId, amount, createdAt: Date.now() };
  state.orders[o.id] = o;
  return json({ orderId: o.id, free: false, amountUsd: amount, checkoutUrl: 'https://gumroad.com/' });
}

function orderStatus(orderId) {
  const o = state.orders[orderId];
  if (!o) return json({ error: 'NOT_FOUND' }, 404);
  if (o.status === 'pending' && Date.now() - o.createdAt > PAYMENT_DELAY_MS) {
    o.status = 'paid';
    state.payments.unshift({ id: id('p'), created_at: new Date().toISOString(), montant_usd: o.amount,
      description: { generation: 'Génération de formulaire', supplement: 'Complément (plus de 100 questions)', translation: 'Traduction', redeploy: 'Redéploiement' }[o.kind] });
  }
  return json({ status: o.status });
}

function claim(orderId, kind) {
  const o = state.orders[orderId];
  if (!o || o.kind !== kind || o.status !== 'paid') return null;
  o.status = 'used';
  return o;
}

async function backend(path, method, init) {
  if (path === '/api/import') {
    const file = init.body instanceof FormData ? init.body.get('file') : null;
    let text = '';
    if (file && /\.(txt|csv)$/i.test(file.name)) text = await file.text();
    else text = 'Questionnaire importé depuis ' + (file ? file.name : 'le document') + '\nQ1. Nom du village ?\nQ2. Nombre de personnes dans le ménage ?\nQ3. Source principale d\'eau : 1) Forage 2) Puits 3) Rivière\nQ4. Le ménage possède-t-il une moustiquaire ? 1) Oui 2) Non';
    await wait(700);
    return json({ text, metadata: { chars: text.length }, images: [] });
  }
  if (path === '/api/orders' && method === 'POST') {
    const b = await readBody(init);
    return createOrder(b.kind, b.analysisId);
  }
  if (path.startsWith('/api/orders/')) return orderStatus(decodeURIComponent(path.split('/').pop()));
  if (path === '/api/me/pending') {
    return json({ pending: Object.values(state.pending).map((p) => ({ id: p.id, title: p.titre, question_count: p.count, created_at: p.createdAt })) });
  }
  if (path === '/api/analyse') {
    const b = await readBody(init);
    const o = claim(b.orderId, 'generation');
    if (!o) return json({ error: 'PAYMENT_REQUIRED', message: 'Paiement requis.' }, 402);
    await wait(3500);
    const count = countQuestionsInText(b.text);
    const analysis = { id: id('an'), titre: titleFromText(b.text), created_at: new Date().toISOString(), langue: 'fr', xlsform_json: { survey: survey(count) }, deployments: [] };
    if (!o.free && count > 100) {
      state.pending[analysis.id] = { ...analysis, count, createdAt: analysis.created_at };
      return json({ status: 'supplement_required', analysis_id: analysis.id, question_count: count });
    }
    state.analyses.unshift(analysis);
    return json(deliver(analysis));
  }
  if (path === '/api/analyse/release') {
    const b = await readBody(init);
    const p = state.pending[b.analysisId];
    if (!p || !claim(b.orderId, 'supplement')) return json({ error: 'PAYMENT_REQUIRED', message: 'Paiement requis.' }, 402);
    delete state.pending[b.analysisId];
    const { count, createdAt, ...analysis } = p;
    state.analyses.unshift(analysis);
    await wait(800);
    return json(deliver(analysis));
  }
  if (path === '/api/redeploy') {
    const b = await readBody(init);
    const a = state.analyses.find((x) => x.id === b.analysisId);
    if (!a || !claim(b.orderId, 'redeploy')) return json({ error: 'PAYMENT_REQUIRED', message: 'Paiement requis.' }, 402);
    return json(deliver(a));
  }
  if (path === '/api/translate-xlsform') {
    const b = await readBody(init);
    const src = state.analyses.find((x) => x.id === b.sourceAnalysisId);
    if (!src || !claim(b.orderId, 'translation')) return json({ error: 'PAYMENT_REQUIRED', message: 'Paiement requis.' }, 402);
    await wait(2500);
    const tr = { id: id('an'), titre: src.titre + ' (' + b.targetLang + ')', created_at: new Date().toISOString(), langue: b.targetLangCode, xlsform_json: src.xlsform_json, deployments: [] };
    state.analyses.unshift(tr);
    return json({ xlsform: tr.xlsform_json, analysis_id: tr.id, deploy_ticket: issueTicket(tr.id) });
  }
  if (path.startsWith('/api/deploy/')) {
    const b = await readBody(init);
    const ticket = state.tickets[b.ticket];
    if (!ticket || ticket.used) return json({ error: 'PAYMENT_REQUIRED', message: 'Paiement requis.' }, 402);
    await wait(1800);
    const tool = path.split('/').pop();
    const creds = b.credentials || {};
    if ((tool === 'kobo' && creds.password === 'faux') || (tool === 'jotform' && creds.apiKey === 'faux')) {
      return json({ error: 'AUTH_ERROR', message: 'Identifiants incorrects.' }, 401);
    }
    ticket.used = true;
    if (tool === 'excel') return new Response(new Blob(['demo']), { status: 200 });
    const urls = { kobo: 'https://kf.kobotoolbox.org/', jotform: 'https://www.jotform.com/myforms/', google: 'https://docs.google.com/forms' };
    return json({ success: true, uid: 'demo', formId: 'demo', url: urls[tool] || urls.kobo });
  }
  return json({});
}

export function installDemo() {
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, window.location.href);
    const method = (init.method || 'GET').toUpperCase();
    if (url.hostname.endsWith('supabase.co')) return supabase(url.pathname + url.search, method, init);
    if (url.hostname.endsWith('onrender.com')) return backend(url.pathname, method, init);
    return realFetch(input, init);
  };
  try { localStorage.removeItem('lebo_token'); localStorage.removeItem('lebo_user'); localStorage.removeItem('lebo_refresh'); } catch { /* stockage indisponible */ }
}
