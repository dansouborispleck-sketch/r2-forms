import { useEffect, useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import StepsBar from './components/StepsBar';
import Panel1 from './components/Panel1';
import Panel2 from './components/Panel2';
import ProcessingScreen from './components/ProcessingScreen';
import ProcessingScreen2 from './components/ProcessingScreen2';
import Panel5 from './components/Panel5';
import MissingChoicesOverlay from './components/MissingChoicesOverlay';
import InfoBanner from './components/InfoBanner';
import Features from './components/Features';
import Footer from './components/Footer';
import Toast from './components/Toast';
import AuthModal from './components/AuthModal';
import UserBar from './components/UserBar';
import RechargeModal from './components/RechargeModal';
import HistoriqueModal from './components/HistoriqueModal';
import DeploymentsModal from './components/DeploymentsModal';
import { useToast } from './lib/useToast';
import { useLang } from './lib/LangContext';
import { consumeGoogleOAuthReturn } from './lib/google';
import { useAuth } from './lib/useAuth';
import { toolById } from './lib/tools';
import { countSurveyQuestions } from './lib/xlsform';
import { LANGUAGES } from './lib/languages';
import { sbFetch } from './lib/supabase';
import {
  analyseQuestionnaire, retryAnalysisBilling, deployToKobo, deployToJotForm, deployToGoogle, deployToExcel,
  downloadImagesZip, triggerBlobDownload, translateXlsform, redeployBill,
} from './lib/api';

// Sixieme tranche : historique des transactions + historique des deploiements avec
// redeploiement (vers le meme outil ou un autre, avec ou sans traduction) sans reprendre
// l'analyse du document source. Dernier morceau fonctionnel du chantier avant la passe
// de tests complete.
export default function App() {
  const { t, lang } = useLang();
  const { message, showToast } = useToast();
  const [step, setStep] = useState(1);
  const [phase, setPhase] = useState('wizard'); // wizard | analyzing | deploying | done
  const [selectedTool, setSelectedTool] = useState('kobo');
  const [step1Data, setStep1Data] = useState(null);
  const [googleAccessToken, setGoogleAccessToken] = useState(null);
  const [procTitle, setProcTitle] = useState('');
  const [procSub, setProcSub] = useState('');
  const [missingChoices, setMissingChoices] = useState(null); // { message, resume: fn }
  const [banners, setBanners] = useState([]); // encarts flottants empiles (rapport de coherence, avertissements)
  const [result, setResult] = useState(null); // { deployedFormUrl, stats, message, xlsform, title }
  const [rechargeOpen, setRechargeOpen] = useState(false);
  // Non-null si une analyse a deja ete calculee (appel Claude reussi) mais pas encore
  // facturee faute de solde suffisant au tarif reel — permet, apres recharge, de refacturer
  // ce resultat deja pret (retryAnalysisBilling) au lieu de relancer toute l'analyse et
  // payer un second appel Claude pour le meme document. Voir onCredited de RechargeModal.
  const [pendingAnalysis, setPendingAnalysis] = useState(null); // { id, data, credentials }
  const [historiqueOpen, setHistoriqueOpen] = useState(false);
  const [deploiementsOpen, setDeploiementsOpen] = useState(false);
  // Non-null pendant un redeploiement depuis l'historique : le xlsform est deja pret,
  // handleStep2Continue doit alors deployer directement plutot que relancer une analyse.
  const [redeployPending, setRedeployPending] = useState(null); // { analysis: {xlsform,title,analysisId} }

  const [googleToolReturn] = useState(() => consumeGoogleOAuthReturn());

  useEffect(() => {
    if (!googleToolReturn) return;
    setGoogleAccessToken(googleToolReturn.googleAccessToken);
    setSelectedTool(googleToolReturn.selectedTool);
    if (googleToolReturn.content) {
      setStep1Data((prev) => ({ ...(prev || {}), pasteContent: googleToolReturn.content, fileContent: googleToolReturn.content }));
    }
    if (googleToolReturn.redeployAnalysis) {
      setRedeployPending({ analysis: googleToolReturn.redeployAnalysis });
    }
    setStep(2);
    showToast(t('✅ Compte Google connecté', '✅ Google account connected'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const auth = useAuth(!!googleToolReturn);

  function pushBanner({ title, lines, footer, color, autoDismissMs }) {
    const id = Date.now() + Math.random();
    setBanners((prev) => [...prev, { id, title, lines, footer, color }]);
    if (autoDismissMs) setTimeout(() => setBanners((prev) => prev.filter((b) => b.id !== id)), autoDismissMs);
  }
  function closeBanner(id) {
    setBanners((prev) => prev.filter((b) => b.id !== id));
  }

  function handleStep1Continue(data) {
    setStep1Data(data);
    if (data.selectedTool === 'excel') {
      runAnalysis(data, null);
      return;
    }
    setStep(2);
  }

  async function handleStep2Continue(credentials) {
    if (redeployPending) {
      const { analysis } = redeployPending;
      setRedeployPending(null);
      await runDeploy({ selectedTool, sourceImages: [] }, credentials, analysis);
      return;
    }
    await runAnalysis(step1Data, credentials);
  }

  // Reproduit redeployFromHistory() de l'original : facture le redeploiement (10% du
  // tarif d'origine) ou, si une langue differente est demandee, traduit d'abord
  // (20%, nouvelle ligne "analyses" liee via source_analysis_id pour ne jamais perdre la
  // version d'origine) — puis deploie directement le xlsform deja pret, sans reprendre
  // l'analyse du document source. Les identifiants de deploiement sont toujours
  // redemandes (jamais stockes).
  async function handleRedeployFromHistory(a, targetTool, targetLangCode) {
    if (!a.xlsform_json) { showToast('❌ Xlsform introuvable pour cette analyse'); return; }
    if (!auth.user) { showToast(t('🔒 Connexion requise', '🔒 Login required')); return; }

    let current = a;
    try {
      if (targetLangCode) {
        const langue = LANGUAGES.find((l) => l.code === targetLangCode);
        if (!langue) { showToast('❌ Langue inconnue'); return; }
        const tData = await translateXlsform({
          xlsform: a.xlsform_json, targetLang: langue.label, targetLangCode, titre: a.titre,
          sourceAnalysisId: a.id, outil: targetTool,
        });
        const titreTraduit = (a.titre || 'Questionnaire') + ' (' + langue.label + ')';
        const titreDeploye = tData.xlsform?.settings?.[0]?.form_title || titreTraduit;
        current = { id: tData.analysis_id, xlsform_json: tData.xlsform, titre: titreDeploye, nb_questions: a.nb_questions };
        await auth.loadProfile();
        showToast(`🌐 Traduit en ${langue.label} (-${(tData.tarif || 0).toLocaleString('fr-FR')} FCFA)` + (tData.truncated ? ' — partiellement, questionnaire volumineux, le reste reste dans la langue d\'origine' : ''));
      } else {
        const bData = await redeployBill({ xlsform: a.xlsform_json, targetTool, titre: a.titre });
        await auth.loadProfile();
        showToast(`💳 Redéploiement facturé (-${(bData.tarif || 0).toLocaleString('fr-FR')} FCFA)`);
      }
    } catch (e) {
      showToast('❌ ' + (e.message || 'Erreur'));
      if (/solde insuffisant/i.test(e.message || '')) setRechargeOpen(true);
      return;
    }

    if (targetTool === 'excel') {
      try {
        const { blob, filename } = await deployToExcel({ xlsform: current.xlsform_json, title: current.titre });
        triggerBlobDownload(blob, filename);
        await sbFetch('/rest/v1/deployments', 'POST', {
          analysis_id: current.id, user_id: auth.user.id, outil: 'excel', form_url: null, form_id: null,
        }, auth.accessToken);
        showToast('✅ Fichier Excel régénéré');
      } catch (e) {
        showToast('❌ ' + (e.message || 'Erreur génération Excel'));
      }
      return;
    }

    setDeploiementsOpen(false);
    setSelectedTool(targetTool);
    setRedeployPending({ analysis: { xlsform: current.xlsform_json, title: current.titre, media: [], analysisId: current.id, needsReview: [] } });
    setStep(2);
    setPhase('wizard'); // sinon l'ecran precedent (ex: le resultat d'un deploiement Google
    // Forms deja termine) reste affiche, puisque le rendu se decide sur `phase`, pas sur
    // `step` seul — sans ca, changer d'outil cible depuis l'historique n'avait aucun effet
    // visible tant qu'un deploiement precedent avait deja abouti dans la meme session.
  }

  async function runAnalysis(data, credentials) {
    // Verification appliquee uniformement a TOUS les outils (y compris le chemin direct
    // Excel, qui saute l'etape 2) — comme l'original, ou startAnalysis() fait ce controle
    // avant toute chose. En pratique la modale de connexion bloque deja toute interaction
    // avec l'appli tant que personne n'est connecte ; ce controle reste une securite
    // redondante plutot que le seul rempart.
    if (!auth.user) {
      showToast(t('🔒 Connexion requise pour analyser un questionnaire', '🔒 Login required to analyse a questionnaire'));
      return;
    }
    setPhase('analyzing');
    const payload = data.pdfBase64Content
      ? Object.assign({ pdfBase64: data.pdfBase64Content }, data.sourceImages?.length ? { images: data.sourceImages } : {})
      : { text: data.fileContent || data.pasteContent };

    try {
      const analysis = await analyseQuestionnaire(payload, data.selectedTool);
      await auth.loadProfile(); // le debit a deja eu lieu cote serveur, on rafraichit juste l'affichage
      await new Promise((r) => setTimeout(r, 1000));
      await handleAnalysisResult(analysis, data, credentials);
    } catch (e) {
      console.error('Erreur analyse:', e);
      setPhase('wizard');
      if (e.code === 'UNAUTHORIZED') {
        showToast(t('🔒 Connexion requise', '🔒 Login required'));
      } else if (e.code === 'INSUFFICIENT_BALANCE') {
        // Le xlsform est deja calcule et conserve cote serveur (e.pendingAnalysisId) : pas
        // besoin de relancer l'analyse (donc un nouvel appel Claude payant) apres la
        // recharge, onCredited de RechargeModal se charge de le refacturer directement.
        if (e.pendingAnalysisId) setPendingAnalysis({ id: e.pendingAnalysisId, data, credentials });
        showToast('❌ ' + (e.message || t('Solde insuffisant — rechargez votre compte', 'Insufficient balance — top up your account')));
        setRechargeOpen(true);
      } else {
        showToast(t('Erreur. Veuillez réessayer.', 'Error. Please try again.'));
      }
    }
  }

  // Suite commune apres une analyse reussie (nouvelle ou refacturee via retryAnalysisBilling
  // sans nouvel appel Claude) : rapport de coherence, elements a revoir, modalites manquantes,
  // puis deploiement.
  async function handleAnalysisResult(analysis, data, credentials) {
    if (analysis.coherenceReport.length > 0) {
      pushBanner({
        title: t('Rapport analyse du questionnaire', 'Questionnaire analysis report'),
        lines: analysis.coherenceReport,
        footer: t('Cliquez pour fermer', 'Click to close'),
        color: '#1e3a5f',
        autoDismissMs: 15000,
      });
    }
    if (analysis.needsReview.length > 0) {
      showToast(t(`⚠️ ${analysis.needsReview.length} élément(s) à vérifier après déploiement`, `⚠️ ${analysis.needsReview.length} item(s) to review after deployment`));
    }

    if (analysis.missingChoicesCount > 0) {
      setMissingChoices({
        message: analysis.warning || '',
        resume: () => { setMissingChoices(null); runDeploy(data, credentials, analysis); },
      });
      return;
    }
    if (analysis.warning) {
      pushBanner({
        title: '⚠️ ' + t('Questionnaire partiellement extrait', 'Questionnaire partially extracted'),
        lines: [analysis.warning],
        color: '#7c2d12',
        autoDismissMs: 12000,
      });
    }
    await runDeploy(data, credentials, analysis);
  }

  // Appele apres une recharge reussie (onCredited de RechargeModal) quand une analyse
  // etait en attente de facturation : refacture le xlsform deja produit, SANS relancer
  // Claude. Si le solde est encore insuffisant (recharge partielle), l'attente est
  // conservee pour une nouvelle tentative apres une recharge complementaire.
  async function retryPendingAnalysis() {
    if (!pendingAnalysis) return;
    const { id, data, credentials } = pendingAnalysis;
    setPhase('analyzing');
    try {
      const analysis = await retryAnalysisBilling(id);
      setPendingAnalysis(null);
      await auth.loadProfile();
      await handleAnalysisResult(analysis, data, credentials);
    } catch (e) {
      console.error('Erreur refacturation analyse en attente:', e);
      setPhase('wizard');
      if (e.code === 'INSUFFICIENT_BALANCE' && e.pendingAnalysisId) {
        showToast('❌ ' + (e.message || t('Solde toujours insuffisant', 'Balance still insufficient')));
        setRechargeOpen(true);
      } else {
        setPendingAnalysis(null);
        showToast('❌ ' + (e.message || t('Analyse en attente expirée — merci de relancer l\'analyse.', 'Pending analysis expired — please re-run the analysis.')));
      }
    }
  }

  async function runDeploy(data, credentials, analysis) {
    setPhase('deploying');
    setProcTitle(t('Déploiement en cours...', 'Deploying...'));
    setProcSub(t('Connexion à votre compte...', 'Connecting to your account...'));

    const form = { xlsform: analysis.xlsform, title: analysis.title, media: analysis.media };
    let deployResult;
    try {
      if (data.selectedTool === 'jotform') {
        setProcSub(t('Déploiement JotForm...', 'Deploying to JotForm...'));
        deployResult = await deployToJotForm(form, { apiKey: credentials.apiKey });
      } else if (data.selectedTool === 'google') {
        setProcSub(t('Déploiement Google Forms...', 'Deploying to Google Forms...'));
        if (!credentials.googleAccessToken) throw new Error(t('Connectez votre compte Google à l\'étape 2.', 'Connect your Google account in step 2.'));
        deployResult = await deployToGoogle(form, { accessToken: credentials.googleAccessToken });
      } else if (data.selectedTool === 'excel') {
        setProcSub(t('Génération du fichier Excel...', 'Generating Excel file...'));
        const { blob, filename } = await deployToExcel(form);
        triggerBlobDownload(blob, filename);
        deployResult = { uid: 'excel', url: '#' };
      } else {
        if (!credentials?.username || !credentials?.password) throw new Error(t('Identifiants manquants', 'Missing credentials'));
        deployResult = await deployToKobo(form, credentials);
      }

      const deployedFormUrl = deployResult.url;

      if (auth.user && analysis.analysisId) {
        try {
          const depInsert = await sbFetch('/rest/v1/deployments', 'POST', {
            analysis_id: analysis.analysisId, user_id: auth.user.id, outil: data.selectedTool,
            form_url: data.selectedTool === 'excel' ? null : (deployResult.url || null),
            form_id: deployResult.uid || null,
          }, auth.accessToken, { Prefer: 'return=representation' });
          if (depInsert && depInsert.code) console.error('[HISTORIQUE] Echec enregistrement deploiement:', depInsert);
        } catch (e) { console.error('[HISTORIQUE] Erreur reseau enregistrement deploiement:', e); }
      }

      if (data.sourceImages?.length > 0) {
        try {
          showToast('📥 ' + t('Téléchargement des images en cours...', 'Downloading images...'));
          const { blob, filename } = await downloadImagesZip(data.sourceImages, analysis.title || 'formulaire');
          triggerBlobDownload(blob, filename);
        } catch (e) { console.error('[ZIP] Erreur:', e.message); }
      }

      const qRows = countSurveyQuestions(analysis.xlsform);
      const q = qRows.length;
      const g = (analysis.xlsform?.survey || []).filter((r) => r.type === 'begin_group' || r.type === 'begin_repeat').length || 1;
      const l = qRows.filter((r) => r.relevant && r.relevant.trim()).length;

      const toolName = toolById(data.selectedTool).name;
      let deployMsg = t(
        `Votre masque a été déployé avec succès sur ${toolName}. Cliquez sur "Accéder à mon compte" pour le retrouver.`,
        `Your form has been successfully deployed to ${toolName}. Click "Access my account" to find it.`
      );
      if (deployResult.mediaAssociated > 0) {
        deployMsg += t(` 🖼️ ${deployResult.mediaAssociated} image(s) associée(s) automatiquement à leur modalité dans ${toolName}.`, ` 🖼️ ${deployResult.mediaAssociated} image(s) automatically matched to their answer choice in ${toolName}.`);
      }
      if (data.selectedTool === 'jotform' && l > 0) {
        deployMsg += t(
          ` ⚠️ Ce questionnaire comporte ${l} saut(s) conditionnel(s) — JotForm ne permet pas de les configurer automatiquement via l'API, vous devrez les recréer manuellement dans Paramètres > Conditions.`,
          ` ⚠️ This questionnaire has ${l} conditional skip(s) — JotForm does not support configuring these automatically via its API; you will need to recreate them manually in Settings > Conditions.`
        );
      }
      if ((data.selectedTool === 'google' || data.selectedTool === 'jotform') && deployResult.repeatsFlattened > 0) {
        deployMsg += t(
          ` 🔁 ${deployResult.repeatsFlattened} groupe(s) répété(s) du questionnaire ont été transformés en sections numérotées fixes (${toolName} ne sait pas répéter un groupe de questions dynamiquement) — vérifiez que le nombre de sections générées correspond à vos besoins.`,
          ` 🔁 ${deployResult.repeatsFlattened} repeated group(s) in this questionnaire were converted into fixed numbered sections (${toolName} cannot repeat a group of questions dynamically) — check that the number of generated sections fits your needs.`
        );
      }
      if (data.sourceImages?.length > 0) {
        deployMsg += t(
          ` 📦 ${data.sourceImages.length} image(s) du document téléchargée(s) en ZIP — à intégrer manuellement si besoin dans ${toolName}.`,
          ` 📦 ${data.sourceImages.length} document image(s) downloaded as ZIP — add them manually if needed in ${toolName}.`
        );
      }
      if (analysis.needsReview.length > 0) {
        deployMsg += t(` ⚠️ ${analysis.needsReview.length} élément(s) à vérifier — à contrôler dans ${toolName}.`, ` ⚠️ ${analysis.needsReview.length} item(s) to review — check them in ${toolName}.`);
      }

      setResult({
        deployedFormUrl,
        stats: { q, g, l },
        message: deployMsg,
        xlsform: analysis.xlsform,
        title: analysis.title,
      });
      setStep(3);
      setPhase('done');
    } catch (err) {
      console.error('Erreur deploiement:', err);
      setPhase('wizard');
      setStep(2);
      showToast('❌ ' + (err.message || t('Erreur de déploiement. Vérifiez vos identifiants.', 'Deployment error.')));
    }
  }

  function restart() {
    window.location.reload();
  }

  return (
    <>
      <Header />
      {auth.ready && <UserBar
        profile={auth.profile}
        onSignOut={auth.signOut}
        onRecharge={() => setRechargeOpen(true)}
        onHistorique={() => setHistoriqueOpen(true)}
        onDeploiements={() => setDeploiementsOpen(true)}
      />}
      <Hero />
      <StepsBar currentStep={step} />
      <div style={{ padding: '0 32px' }}>
        <div className="main-card">
          {phase === 'wizard' && (
            <>
              <div style={{ display: step === 1 ? 'block' : 'none' }}>
                <Panel1 selectedTool={selectedTool} onSelectTool={setSelectedTool} onContinue={handleStep1Continue} showToast={showToast} />
              </div>
              <div style={{ display: step === 2 ? 'block' : 'none' }}>
                <Panel2
                  selectedTool={selectedTool}
                  googleAccessToken={googleAccessToken}
                  onBack={() => { setRedeployPending(null); setStep(1); }}
                  onContinue={handleStep2Continue}
                  showToast={showToast}
                  pendingContent={step1Data?.fileContent || step1Data?.pasteContent || ''}
                  redeployMode={!!redeployPending}
                  redeployAnalysis={redeployPending?.analysis}
                />
              </div>
            </>
          )}
          {phase === 'analyzing' && <ProcessingScreen />}
          {phase === 'deploying' && <ProcessingScreen2 title={procTitle} sub={procSub} />}
          {phase === 'done' && result && (
            <Panel5
              selectedTool={selectedTool}
              deployedFormUrl={result.deployedFormUrl}
              stats={result.stats}
              message={result.message}
              xlsform={result.xlsform}
              title={result.title}
              onRestart={restart}
              showToast={showToast}
              t={t}
            />
          )}
        </div>
      </div>
      <Features />
      <Footer />
      <Toast message={message} />
      <AuthModal
        open={auth.ready && !auth.user}
        onLogin={auth.login}
        onSignup={auth.signup}
        onGoogleSignIn={auth.signInWithGoogle}
        authError={auth.error}
        clearAuthError={() => auth.setError(null)}
      />
      {missingChoices && (
        <MissingChoicesOverlay message={missingChoices.message} onAcknowledge={missingChoices.resume} t={t} />
      )}
      {banners.map((b, i) => (
        <InfoBanner key={b.id} title={b.title} lines={b.lines} footer={b.footer} color={b.color} offset={i} onClose={() => closeBanner(b.id)} />
      ))}
      <RechargeModal
        open={rechargeOpen}
        onClose={() => setRechargeOpen(false)}
        email={auth.user?.email || 'client@lebo.bj'}
        accessToken={auth.accessToken}
        showToast={showToast}
        onCredited={async () => {
          await auth.loadProfile();
          if (pendingAnalysis) await retryPendingAnalysis();
        }}
      />
      <HistoriqueModal open={historiqueOpen} onClose={() => setHistoriqueOpen(false)} user={auth.user} accessToken={auth.accessToken} />
      <DeploymentsModal
        open={deploiementsOpen}
        onClose={() => setDeploiementsOpen(false)}
        user={auth.user}
        accessToken={auth.accessToken}
        onRedeploy={handleRedeployFromHistory}
      />
    </>
  );
}
