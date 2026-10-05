import { useEffect, useRef, useState } from 'react';
import Nav from './components/Nav';
import AuthDialog from './components/AuthDialog';
import AccountDrawer from './components/AccountDrawer';
import SourceInput from './components/SourceInput';
import ToolGrid from './components/ToolGrid';
import ToolAccess from './components/ToolAccess';
import Footer from './components/Footer';
import { useLang } from './lib/LangContext';
import { consumeGoogleOAuthReturn, startGoogleAuth } from './lib/google';
import { useAuth } from './lib/useAuth';
import { toolById } from './lib/tools';
import { LANGUAGES } from './lib/languages';
import { sbFetch } from './lib/supabase';
import { openCheckoutWindow, payOrder } from './lib/payment';
import { reusePriceUsd } from './lib/pricing';
import { IS_DEMO } from './lib/env';
import DemoPanel from './components/DemoPanel';
import {
  analyseQuestionnaire, releaseAnalysis, translateXlsform, redeployAnalysis, listPendingAnalyses, deployForm,
  downloadImagesZip, triggerBlobDownload,
} from './lib/api';

const EMPTY_SOURCE = { fileName: null, fileContent: '', pdfBase64Content: null, docxLayoutBlocksContent: null, sourceImages: [], pasteContent: '' };
const EMPTY_CREDS = { username: '', password: '', server: '', apiKey: '', googleAccessToken: null };

// Tout le parcours tient sur une seule page, de haut en bas :
// 01 questionnaire -> 02 outil -> 03 acces a l'outil -> 04 generer (paiement) -> resultat.
// Aucun message d'analyse : la page n'affiche que ce qui concerne le paiement, et les
// erreurs bloquantes.
//
// phase : idle | paying | analyzing | supplement | deploying | done
export default function App() {
  const { t, lang } = useLang();
  const [googleReturn] = useState(() => consumeGoogleOAuthReturn());
  const auth = useAuth(!!googleReturn);

  const [source, setSource] = useState(EMPTY_SOURCE);
  const [tool, setTool] = useState('kobo');
  const [creds, setCreds] = useState(EMPTY_CREDS);
  // Formulaire deja genere, reutilise depuis "Mon compte" (redeploiement / traduction).
  const [reuse, setReuse] = useState(null); // { analysis: row, langCode }
  // Questionnaire de plus de 100 questions dont le complement n'a pas ete paye (reprise
  // apres fermeture de la page).
  const [resume, setResume] = useState(null); // { id, title, question_count }
  const [pendingList, setPendingList] = useState([]);

  const [phase, setPhase] = useState('idle');
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [error, setError] = useState(null);
  // Analyse deja payee et liberee : un echec de deploiement (mauvais identifiants...) se
  // relance sans repayer ni reanalyser.
  const [paid, setPaid] = useState(null); // { analysisId, title, xlsform, media }
  const [pendingSupplement, setPendingSupplementState] = useState(null); // analysisId
  const supplementRef = useRef(null);
  const setPendingSupplement = (id) => { supplementRef.current = id; setPendingSupplementState(id); };
  const [result, setResult] = useState(null); // { url, tool, title }

  const [authMode, setAuthMode] = useState(null); // null | 'login' | 'signup'
  const [accountOpen, setAccountOpen] = useState(false);
  const abortRef = useRef(null);
  const resultRef = useRef(null);
  const flowRef = useRef(null);

  useEffect(() => {
    if (!googleReturn) return;
    setTool(googleReturn.selectedTool);
    setCreds((c) => ({ ...c, googleAccessToken: googleReturn.googleAccessToken }));
    if (googleReturn.content) setSource({ ...EMPTY_SOURCE, pasteContent: googleReturn.content });
    if (googleReturn.redeployAnalysis) setReuse(googleReturn.redeployAnalysis);
    setTimeout(() => document.getElementById('step-access')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  }, [googleReturn]);

  const userId = auth.user?.id;
  useEffect(() => {
    if (!userId) { setPendingList([]); return; }
    listPendingAnalyses().then(setPendingList).catch(() => setPendingList([]));
  }, [userId]);

  useEffect(() => {
    if (phase === 'done') resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [phase]);

  const busy = ['paying', 'analyzing', 'deploying'].includes(phase);
  const hasSource = !!reuse || !!resume || !!source.pdfBase64Content || source.fileContent.length > 0 || source.pasteContent.trim().length > 20;
  const hasAccess =
    tool === 'excel' ||
    (tool === 'google' && !!creds.googleAccessToken) ||
    (tool === 'jotform' && creds.apiKey.trim().length > 0) ||
    (!['excel', 'google', 'jotform'].includes(tool) && creds.username.trim() && creds.password && (tool !== 'odk' || creds.server.trim()));
  const canGenerate = hasSource && hasAccess && !busy;
  // Generation offerte : essai gratuit non utilise, ou generation bonus (anciens soldes).
  const freeTrial = !auth.user || !auth.profile?.free_trial_used || (auth.profile?.bonus_generations || 0) > 0;
  const reusePrice = reuse ? reusePriceUsd(reuse.analysis.xlsform_json) : null;

  function resetRun() {
    setPaid(null);
    setPendingSupplement(null);
    setResult(null);
    setError(null);
    setPhase('idle');
  }

  function changeSource(s) { setSource(s); setReuse(null); setResume(null); resetRun(); }
  function changeTool(id) { setTool(id); if (phase === 'done') resetRun(); }

  function handleGoogleConnect() {
    if (IS_DEMO) { setCreds((c) => ({ ...c, googleAccessToken: 'demo' })); return; }
    const text = source.fileContent || source.pasteContent;
    startGoogleAuth({ selectedTool: tool, fileContent: text, pasteContent: text, redeployAnalysis: reuse });
  }

  function handleReuse(row) {
    setAccountOpen(false);
    setSource(EMPTY_SOURCE);
    resetRun();
    setResume(null);
    setReuse({ analysis: row, langCode: '' });
    setTimeout(() => flowRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  function handleResume(item) {
    setSource(EMPTY_SOURCE);
    setReuse(null);
    resetRun();
    setResume(item);
  }

  function errorText(e) {
    if (e.code === 'PAYMENT_TIMEOUT') return t('Paiement non reçu. Réessayez.', 'Payment not received. Please try again.');
    if (e.code === 'PAYMENT_FAILED') return t('Paiement refusé. Réessayez.', 'Payment declined. Please try again.');
    return e.message || t('Une erreur est survenue. Réessayez.', 'Something went wrong. Please try again.');
  }

  async function pay(kind, extra, win) {
    setPhase('paying');
    setCheckoutUrl(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      return await payOrder(kind, extra, { checkoutWindow: win, onAwaiting: (url) => setCheckoutUrl(url), signal: controller.signal });
    } finally {
      abortRef.current = null;
      setCheckoutUrl(null);
    }
  }

  function cancelPayment() {
    abortRef.current?.abort();
  }

  async function guarded(fn) {
    setError(null);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      const next = supplementRef.current ? 'supplement' : 'idle';
      setPhase(next);
      if (e.code !== 'CANCELLED') setError(errorText(e));
    }
  }

  function handleGenerate() {
    if (!auth.user) { setAuthMode('signup'); return; }
    if (!canGenerate) return;
    if (paid) { guarded(() => deploy(paid)); return; }
    // Fenetre de paiement ouverte des le clic (sinon bloquee par le navigateur) — sauf
    // si le premier formulaire gratuit s'applique.
    const needsCheckout = !!reuse || !!resume || !freeTrial;
    const win = needsCheckout ? openCheckoutWindow() : null;
    if (resume) { setPendingSupplement(resume.id); guarded(() => runSupplement(resume.id, win)); return; }
    guarded(() => (reuse ? runReuse(win) : runGeneration(win)));
  }

  async function runGeneration(win) {
    const orderId = await pay('generation', {}, win);
    setPhase('analyzing');
    const s = source;
    const payload = s.pdfBase64Content
      ? { pdfBase64: s.pdfBase64Content, uiLang: lang }
      : Object.assign({ text: s.fileContent || s.pasteContent, uiLang: lang }, s.docxLayoutBlocksContent ? { docxLayoutBlocks: s.docxLayoutBlocksContent } : {});
    if (s.sourceImages.length) payload.images = s.sourceImages;
    const analysis = await analyseQuestionnaire(payload, tool, orderId);
    auth.loadProfile();
    if (analysis.status === 'supplement_required') {
      setPendingSupplement(analysis.analysisId);
      setPhase('supplement');
      return;
    }
    await deploy(analysis);
  }

  function handleSupplement() {
    const win = openCheckoutWindow();
    guarded(() => runSupplement(pendingSupplement, win));
  }

  async function runSupplement(analysisId, win) {
    const orderId = await pay('supplement', { analysisId }, win);
    setPhase('analyzing');
    const analysis = await releaseAnalysis(analysisId, orderId);
    setPendingSupplement(null);
    setResume(null);
    setPendingList((list) => list.filter((p) => p.id !== analysisId));
    await deploy(analysis);
  }

  async function runReuse(win) {
    const row = reuse.analysis;
    if (reuse.langCode) {
      const langue = LANGUAGES.find((l) => l.code === reuse.langCode);
      const orderId = await pay('translation', { analysisId: row.id }, win);
      setPhase('analyzing');
      const tr = await translateXlsform({
        targetLang: langue.label, targetLangCode: langue.code, sourceAnalysisId: row.id, outil: tool, orderId,
      });
      const title = tr.xlsform?.settings?.[0]?.form_title || `${row.titre || 'Questionnaire'} (${langue.label})`;
      await deploy({ analysisId: tr.analysis_id, title, xlsform: tr.xlsform, deployTicket: tr.deploy_ticket });
    } else {
      const orderId = await pay('redeploy', { analysisId: row.id }, win);
      setPhase('analyzing');
      const analysis = await redeployAnalysis({ analysisId: row.id, orderId, targetTool: tool });
      await deploy(analysis);
    }
  }

  async function deploy(analysis) {
    setPaid(analysis);
    setPhase('deploying');
    const res = await deployForm(tool, { ticket: analysis.deployTicket, title: analysis.title }, creds);
    if (analysis.analysisId) {
      sbFetch('/rest/v1/deployments', 'POST', {
        analysis_id: analysis.analysisId, user_id: auth.user.id, outil: tool,
        form_url: res.url || null, form_id: res.uid || null,
      }).catch((e) => console.error('[HISTORIQUE]', e));
    }
    if (!reuse && !resume && source.sourceImages.length > 0) {
      downloadImagesZip(source.sourceImages, analysis.title || 'formulaire')
        .then(({ blob, filename }) => triggerBlobDownload(blob, filename))
        .catch((e) => console.error('[ZIP]', e));
    }
    setResult({ url: res.url, tool, title: analysis.title, xlsform: analysis.xlsform });
    setPhase('done');
  }

  function downloadXlsform() {
    const blob = new Blob([JSON.stringify(result.xlsform, null, 2)], { type: 'application/json' });
    triggerBlobDownload(blob, (result.title || 'formulaire').replace(/\s+/g, '_') + '_xlsform.json');
  }

  function startOver() {
    setSource(EMPTY_SOURCE);
    setReuse(null);
    setResume(null);
    resetRun();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const toolName = toolById(tool).name;
  let cta = t('Générer le formulaire', 'Generate the form');
  if (paid) cta = t('Relancer le déploiement', 'Retry deployment');
  else if (resume) cta = t('Payer 5 $ et récupérer', 'Pay $5 and retrieve');
  else if (reuse) cta = reuse.langCode ? t('Traduire et déployer', 'Translate and deploy') : t('Redéployer', 'Redeploy');
  const totalLabel = reuse ? `${reusePrice} $` : resume ? '5 $' : freeTrial ? null : '5 $';

  return (
    <>
      <Nav
        user={auth.user}
        profile={auth.profile}
        onLogin={() => setAuthMode('login')}
        onSignup={() => setAuthMode('signup')}
        onAccount={() => setAccountOpen(true)}
        onSignOut={auth.signOut}
      />

      <header className="hero" id="top">
        <div className="eyebrow">{t('Du questionnaire au formulaire', 'From questionnaire to form')}</div>
        <h1>
          {t('Votre questionnaire,', 'Your questionnaire,')}<br />
          <span className="accent">{t('prêt à collecter.', 'ready to collect.')}</span>
        </h1>
        <p className="lead">
          {t(
            'Importez votre document. TransQi le transforme en formulaire et le déploie directement dans KoboToolbox, ODK, Google Forms, JotForm ou Excel.',
            'Import your document. TransQi turns it into a form and deploys it straight to KoboToolbox, ODK, Google Forms, JotForm or Excel.'
          )}
        </p>
        <div className="pricing">
          <div className="price-card price-free">
            <div className="price-amount">{t('Offert', 'Free')}</div>
            <div className="price-label">{t('votre premier formulaire, quelle que soit sa taille', 'your first form, whatever its size')}</div>
          </div>
          <div className="price-card">
            <div className="price-amount">5 $</div>
            <div className="price-label">{t('par formulaire', 'per form')}</div>
          </div>
          <div className="price-card">
            <div className="price-amount">10 $</div>
            <div className="price-label">{t('au-delà de 100 questions', 'over 100 questions')}</div>
          </div>
        </div>
        <p className="pricing-note">
          {t('Traduction ou redéploiement d’un formulaire existant : 3 $, ou 5 $ au-delà de 100 questions. Paiement par carte bancaire.',
            'Translating or redeploying an existing form: $3, or $5 over 100 questions. Card payment.')}
        </p>
        <a href="#flow" className="btn btn-primary btn-lg">{t('Commencer', 'Get started')} ↓</a>
      </header>

      <main className="flow" id="flow" ref={flowRef}>
        {pendingList.length > 0 && !resume && phase !== 'done' && (
          <div className="pending">
            {pendingList.map((p) => (
              <div key={p.id} className="pending-item">
                <div className="list-main">
                  <div className="list-title">{p.title || t('Questionnaire', 'Questionnaire')}</div>
                  <div className="list-meta">{t('En attente du complément de 5 $', 'Awaiting the $5 top-up')}</div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => handleResume(p)}>{t('Reprendre', 'Resume')}</button>
              </div>
            ))}
          </div>
        )}

        <Step n="01" title={t('Votre questionnaire', 'Your questionnaire')}>
          {resume ? (
            <div className="file-chip">
              <span className="file-name">{resume.title || t('Questionnaire', 'Questionnaire')}</span>
              <button className="icon-btn" onClick={() => { setResume(null); resetRun(); }} aria-label={t('Retirer', 'Remove')}>×</button>
            </div>
          ) : reuse ? (
            <div className="reuse">
              <div className="file-chip">
                <span className="file-name">{reuse.analysis.titre || t('Questionnaire', 'Questionnaire')}</span>
                <button className="icon-btn" onClick={() => { setReuse(null); resetRun(); }} aria-label={t('Retirer', 'Remove')}>×</button>
              </div>
              <label className="field">
                <span>{t('Langue', 'Language')}</span>
                <select value={reuse.langCode} onChange={(e) => setReuse({ ...reuse, langCode: e.target.value })} disabled={busy}>
                  <option value="">{t('Langue d’origine', 'Original language')}</option>
                  {LANGUAGES.filter((l) => l.code !== reuse.analysis.langue).map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </label>
            </div>
          ) : (
            <SourceInput source={source} onChange={changeSource} />
          )}
        </Step>

        <Step n="02" title={t('Outil de collecte', 'Collection tool')}>
          <ToolGrid selectedTool={tool} onSelect={changeTool} />
        </Step>

        <Step n="03" title={t('Accès à ', 'Access to ') + toolName} id="step-access">
          <ToolAccess tool={tool} credentials={creds} onChange={setCreds} onGoogleConnect={handleGoogleConnect} />
        </Step>

        <Step n="04" title={phase === 'done' ? t('Votre formulaire', 'Your form') : t('Générer', 'Generate')} last>
          {phase === 'done' && result ? (
            <div className="result" ref={resultRef}>
              <div className="result-check" aria-hidden="true">✓</div>
              <h2>{result.title || t('Formulaire prêt', 'Form ready')}</h2>
              <div className="row center">
                {result.url && (
                  <a className="btn btn-primary" href={result.url} target="_blank" rel="noreferrer">{t('Ouvrir dans ', 'Open in ') + toolById(result.tool).name} ↗</a>
                )}
                <button className="btn btn-outline" onClick={downloadXlsform}>{t('Télécharger', 'Download')}</button>
                <button className="btn btn-ghost" onClick={startOver}>{t('Nouveau formulaire', 'New form')}</button>
              </div>
            </div>
          ) : phase === 'supplement' ? (
            <div className="pay-box pay-box-flush">
              <div className="pay-title">{t('Plus de 100 questions', 'Over 100 questions')}</div>
              <p>{t('Complétez 5 $ pour continuer.', 'Add $5 to continue.')}</p>
              <button className="btn btn-primary btn-block btn-lg" onClick={handleSupplement}>
                <CardIcon /> {t('Payer 5 $', 'Pay $5')}
              </button>
            </div>
          ) : (
            <>
              {!paid && (
                <div className="summary">
                  <span>{t('Total', 'Total')}</span>
                  {totalLabel
                    ? <strong>{totalLabel}</strong>
                    : <strong className="free">{t('Offert', 'Free')}</strong>}
                </div>
              )}
              <button className="btn btn-primary btn-block btn-lg" disabled={!canGenerate && !!auth.user} onClick={handleGenerate}>
                {busy ? <span className="spinner" /> : <>{totalLabel && !paid && <CardIcon />}{cta}</>}
              </button>
            </>
          )}

          {phase === 'paying' && checkoutUrl && (
            <div className="pay-box">
              <div className="pay-title">{t('Finalisez le paiement', 'Complete the payment')}</div>
              <p>{t('Réglez par carte bancaire dans la fenêtre Gumroad. La génération démarre dès réception.', 'Pay by card in the Gumroad window. Generation starts as soon as it is received.')}</p>
              <div className="row">
                <a className="btn btn-outline btn-sm" href={checkoutUrl} target="transqi-checkout" rel="noreferrer">{t('Ouvrir le paiement', 'Open payment')} ↗</a>
                <button className="link muted" onClick={cancelPayment}>{t('Annuler', 'Cancel')}</button>
              </div>
            </div>
          )}

          {(phase === 'analyzing' || phase === 'deploying') && <div className="progress" aria-busy="true"><span /></div>}
          {error && <div className="note note-error">{error}</div>}
        </Step>
      </main>

      <Footer />
      {IS_DEMO && <DemoPanel onSample={(text) => { changeSource({ ...EMPTY_SOURCE, pasteContent: text }); document.getElementById('flow')?.scrollIntoView({ behavior: 'smooth' }); }} />}

      <AuthDialog
        mode={authMode}
        onModeChange={setAuthMode}
        onClose={() => setAuthMode(null)}
        onLogin={auth.login}
        onSignup={auth.signup}
        onGoogleSignIn={auth.signInWithGoogle}
        authError={auth.error}
        clearAuthError={() => auth.setError(null)}
      />
      <AccountDrawer open={accountOpen} onClose={() => setAccountOpen(false)} user={auth.user} onReuse={handleReuse} />
    </>
  );
}

function Step({ n, title, children, id, last }) {
  return (
    <section className={'step' + (last ? ' step-last' : '')} id={id}>
      <div className="step-rail"><span className="step-n">{n}</span></div>
      <div className="step-body">
        <h2 className="step-title">{title}</h2>
        <div className="card">{children}</div>
      </div>
    </section>
  );
}

function CardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19M6.5 15h4" />
    </svg>
  );
}
