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
import {
  analyseQuestionnaire, releaseAnalysis, translateXlsform, deployForm,
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

  useEffect(() => {
    if (phase === 'done') resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [phase]);

  const busy = ['paying', 'analyzing', 'deploying'].includes(phase);
  const hasSource = !!reuse || !!source.pdfBase64Content || source.fileContent.length > 0 || source.pasteContent.trim().length > 20;
  const hasAccess =
    tool === 'excel' ||
    (tool === 'google' && !!creds.googleAccessToken) ||
    (tool === 'jotform' && creds.apiKey.trim().length > 0) ||
    (!['excel', 'google', 'jotform'].includes(tool) && creds.username.trim() && creds.password && (tool !== 'odk' || creds.server.trim()));
  const canGenerate = hasSource && hasAccess && !busy;
  const freeTrial = !auth.user || !auth.profile?.free_trial_used;

  function resetRun() {
    setPaid(null);
    setPendingSupplement(null);
    setResult(null);
    setError(null);
    setPhase('idle');
  }

  function changeSource(s) { setSource(s); setReuse(null); resetRun(); }
  function changeTool(id) { setTool(id); if (phase === 'done') resetRun(); }

  function handleGoogleConnect() {
    const text = source.fileContent || source.pasteContent;
    startGoogleAuth({ selectedTool: tool, fileContent: text, pasteContent: text, redeployAnalysis: reuse });
  }

  function handleReuse(row) {
    setAccountOpen(false);
    setSource(EMPTY_SOURCE);
    resetRun();
    setReuse({ analysis: row, langCode: '' });
    setTimeout(() => flowRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
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
    const win = reuse || !freeTrial ? openCheckoutWindow() : null;
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
    guarded(async () => {
      const orderId = await pay('supplement', { analysisId: pendingSupplement }, win);
      setPhase('analyzing');
      const analysis = await releaseAnalysis(pendingSupplement, orderId);
      setPendingSupplement(null);
      await deploy(analysis);
    });
  }

  async function runReuse(win) {
    const row = reuse.analysis;
    if (reuse.langCode) {
      const langue = LANGUAGES.find((l) => l.code === reuse.langCode);
      const orderId = await pay('translation', { analysisId: row.id }, win);
      setPhase('analyzing');
      const tr = await translateXlsform({
        xlsform: row.xlsform_json, targetLang: langue.label, targetLangCode: langue.code,
        titre: row.titre, sourceAnalysisId: row.id, outil: tool, orderId,
      });
      const title = tr.xlsform?.settings?.[0]?.form_title || `${row.titre || 'Questionnaire'} (${langue.label})`;
      await deploy({ analysisId: tr.analysis_id, title, xlsform: tr.xlsform, media: [] });
    } else {
      await pay('redeploy', { analysisId: row.id }, win);
      await deploy({ analysisId: row.id, title: row.titre, xlsform: row.xlsform_json, media: [] });
    }
  }

  async function deploy(analysis) {
    setPaid(analysis);
    setPhase('deploying');
    const res = await deployForm(tool, { xlsform: analysis.xlsform, title: analysis.title, media: analysis.media }, creds);
    if (analysis.analysisId) {
      sbFetch('/rest/v1/deployments', 'POST', {
        analysis_id: analysis.analysisId, user_id: auth.user.id, outil: tool,
        form_url: res.url || null, form_id: res.uid || null,
      }).catch((e) => console.error('[HISTORIQUE]', e));
    }
    if (!reuse && source.sourceImages.length > 0) {
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
    resetRun();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const toolName = toolById(tool).name;
  let cta = t('Générer le formulaire', 'Generate the form');
  if (paid) cta = t('Relancer le déploiement', 'Retry deployment');
  else if (reuse) cta = reuse.langCode ? t('Traduire et déployer', 'Translate and deploy') : t('Redéployer', 'Redeploy');

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
        <a href="#flow" className="btn btn-primary btn-lg">{t('Commencer', 'Get started')} ↓</a>
      </header>

      <main className="flow" id="flow" ref={flowRef}>
        <Step n="01" title={t('Votre questionnaire', 'Your questionnaire')}>
          {reuse ? (
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

        <Step n="04" title={t('Générer', 'Generate')} last>
          {!reuse && !paid && (
            <div className="summary">
              <span>{t('Total', 'Total')}</span>
              {freeTrial
                ? <strong className="free">{t('Offert', 'Free')}</strong>
                : <strong>5 $</strong>}
            </div>
          )}

          {phase === 'supplement' ? (
            <div className="pay-box">
              <div className="pay-title">{t('Plus de 100 questions', 'Over 100 questions')}</div>
              <p>{t('Complétez 5 $ pour continuer.', 'Add $5 to continue.')}</p>
              <button className="btn btn-primary btn-block btn-lg" onClick={handleSupplement}>
                <CardIcon /> {t('Payer 5 $', 'Pay $5')}
              </button>
            </div>
          ) : (
            <button className="btn btn-primary btn-block btn-lg" disabled={!canGenerate && !!auth.user} onClick={handleGenerate}>
              {busy ? <span className="spinner" /> : <>{!freeTrial && !paid && <CardIcon />}{cta}</>}
            </button>
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

        {phase === 'done' && result && (
          <section className="result" ref={resultRef}>
            <div className="result-check" aria-hidden="true">✓</div>
            <h2>{result.title || t('Formulaire prêt', 'Form ready')}</h2>
            <div className="row center">
              {result.url && (
                <a className="btn btn-primary" href={result.url} target="_blank" rel="noreferrer">{t('Ouvrir dans ', 'Open in ') + toolById(result.tool).name} ↗</a>
              )}
              <button className="btn btn-outline" onClick={downloadXlsform}>{t('Télécharger', 'Download')}</button>
              <button className="btn btn-ghost" onClick={startOver}>{t('Nouveau formulaire', 'New form')}</button>
            </div>
          </section>
        )}
      </main>

      <Footer />

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
