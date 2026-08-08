import { useEffect, useState } from 'react';
import { toolById } from '../lib/tools';
import { startGoogleAuth } from '../lib/google';
import { useLang } from '../lib/LangContext';

// Panel 2 : connexion au compte de l'outil CIBLE (Kobo/ODK/JotForm/Google), a ne pas
// confondre avec la connexion au compte TransQi lui-meme (facturation), geree separement.
export default function Panel2({ selectedTool, googleAccessToken, onBack, onContinue, showToast, pendingContent, redeployMode, redeployAnalysis }) {
  const { t } = useLang();
  const [authMode, setAuthMode] = useState('existing');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [server, setServer] = useState('');
  const [jotformKey, setJotformKey] = useState('');

  const tool = toolById(selectedTool);
  const isJotform = selectedTool === 'jotform';
  const isGoogle = selectedTool === 'google';
  const isKoboOdk = !isJotform && !isGoogle;

  // Reinitialise le mode auth quand on change d'outil, comme selectTool() dans l'original.
  useEffect(() => { setAuthMode('existing'); }, [selectedTool]);

  function handleSignup() {
    if (!tool.signupUrl) return;
    window.open(tool.signupUrl, '_blank');
    showToast("✅ Page d'inscription ouverte. Revenez ici après avoir créé votre compte");
  }

  function handleGoogleConnect() {
    startGoogleAuth({ selectedTool, fileContent: pendingContent, pasteContent: pendingContent, redeployAnalysis: redeployMode ? redeployAnalysis : null });
  }

  function handleContinue() {
    if (isGoogle) {
      onContinue({ type: 'google', googleAccessToken });
    } else if (isJotform) {
      onContinue({ type: 'jotform', apiKey: jotformKey });
    } else {
      onContinue({ type: authMode, username, password, server: selectedTool === 'odk' ? server : null });
    }
  }

  return (
    <div className="panel active">
      <div className="card-head">
        <div className="card-step-label">{t('Étape 2 : Votre compte', 'Step 2: Your account')}</div>
        <div className="card-step-sub">
          {redeployMode
            ? t('Connexion pour redéployer vers ', 'Connect to redeploy to ') + tool.name
            : t('Connexion à votre compte ', 'Connect to your ') + tool.name}
        </div>
      </div>
      <div style={{ padding: 24 }}>
        {isKoboOdk && (
          <>
            <div className="auth-choice">
              <div className={'auth-opt' + (authMode === 'existing' ? ' selected' : '')} onClick={() => setAuthMode('existing')}>
                <div className="auth-opt-title">{t("J'ai déjà un compte", 'I have an account')}</div>
                <div className="auth-opt-desc">{t('Le masque sera ajouté à mon compte', 'The form will be added to my account')}</div>
              </div>
              <div className={'auth-opt' + (authMode === 'new' ? ' selected' : '')} onClick={() => setAuthMode('new')}>
                <div className="auth-opt-title">{t("Je n'ai pas de compte", "I don't have an account")}</div>
                <div className="auth-opt-desc">{t('Un compte sera créé automatiquement', 'An account will be created automatically')}</div>
              </div>
            </div>

            {authMode === 'existing' && (
              <div>
                <div className="field-group">
                  <div className="field-label">{t("Nom d'utilisateur ou email", 'Username or email')}</div>
                  <input type="email" className="field-input" placeholder="votre@email.com" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div className="field-group">
                  <div className="field-label">{t('Mot de passe', 'Password')}</div>
                  <input type="password" className="field-input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                {selectedTool === 'odk' && (
                  <div className="field-group">
                    <div className="field-label">URL du serveur</div>
                    <input type="url" className="field-input" placeholder="https://kf.kobotoolbox.org" value={server} onChange={(e) => setServer(e.target.value)} />
                  </div>
                )}
              </div>
            )}

            {authMode === 'new' && (
              <div style={{ background: '#FFF3F3', border: '1.5px solid #FFD0D0', borderRadius: 14, padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 6 }}>
                  {t('Créer un compte ', 'Create a ') + tool.name + t('', ' account')}
                </div>
                <div style={{ fontSize: 13, color: '#767676', marginBottom: 16, lineHeight: 1.6 }}>
                  {t(
                    `Vous serez redirigé vers le site de ${tool.name} pour créer votre compte gratuitement. Revenez ensuite sur cette page et connectez-vous.`,
                    `You'll be redirected to ${tool.name}'s website to create your account for free. Then come back here and log in.`
                  )}
                </div>
                {tool.signupUrl && (
                  <button onClick={handleSignup} className="btn-next" style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}>
                    🔗 {t('Créer mon compte sur ', 'Create my account on ') + tool.name}
                  </button>
                )}
                <div style={{ fontSize: 12, color: '#767676', padding: 10, background: '#fff', borderRadius: 8, border: '1px solid #eee' }}>
                  💡 {t('Après avoir créé votre compte, revenez ici et cliquez sur "J\'ai déjà un compte" pour vous connecter.', 'After creating your account, come back here and click "I have an account" to log in.')}
                </div>
              </div>
            )}

            <div className="info-box" style={{ marginTop: 12 }}>
              🔒 {t('Vos identifiants sont chiffrés et utilisés uniquement pour déposer votre masque. Ils ne sont jamais conservés.', 'Your credentials are encrypted and only used to deploy your form. They are never stored.')}
            </div>
          </>
        )}

        {isJotform && (
          <>
            <div style={{ background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 12, padding: '10px 14px', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)' }}>⚠️ {t('Important', 'Important')}</div>
              <div style={{ fontSize: 12, color: 'var(--ink)', marginTop: 4 }}>
                {t('Votre clé API doit avoir le niveau d\'accès ', 'Your API key must have the ')}
                <strong>Full Access</strong>
                {t('. Une clé en Read Access ne permettra pas de créer des formulaires.', ' access level. A Read Access key will not allow creating forms.')}
              </div>
            </div>
            <div style={{ background: 'rgba(37,99,235,.05)', border: '1px solid rgba(37,99,235,.15)', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
                📋 {t('Comment obtenir votre clé API JotForm', 'How to get your JotForm API key')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>
                1. {t('Connectez-vous sur', 'Log in at')} <a href="https://www.jotform.com" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>jotform.com</a><br />
                2. {t('Cliquez sur votre photo de profil en haut à droite → Mes paramètres', 'Click your profile photo top right → My Account')}<br />
                3. {t('Cliquez sur API dans le menu', 'Click API in the menu')}<br />
                4. {t('Cliquez sur Créer une nouvelle clé', 'Click Create New Key')}<br />
                5. {t('Copiez la clé et collez-la ci-dessous', 'Copy the key and paste it below')}
              </div>
            </div>
            <div className="field-group">
              <div className="field-label">{t('Clé API JotForm', 'JotForm API key')}</div>
              <input type="text" className="field-input" placeholder={t('Collez votre clé API JotForm ici...', 'Paste your JotForm API key here...')} value={jotformKey} onChange={(e) => setJotformKey(e.target.value)} />
            </div>
            <div className="info-box">
              🔒 {t("Votre clé API est utilisée uniquement pour déposer votre masque. Elle n'est jamais conservée.", 'Your API key is only used to deploy your form. It is never stored.')}
            </div>
          </>
        )}

        {isGoogle && (
          <>
            <div style={{ background: 'rgba(37,99,235,.05)', border: '1px solid rgba(37,99,235,.15)', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
                🔵 {t('Connexion Google', 'Google Connection')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 12 }}>
                {t(
                  'Cliquez sur le bouton ci-dessous pour autoriser TransQi à créer des formulaires dans votre compte Google. Vous serez redirigé vers Google et reviendrez automatiquement.',
                  'Click the button below to authorize TransQi to create forms in your Google account. You will be redirected to Google and will come back automatically.'
                )}
              </div>
              <button
                onClick={handleGoogleConnect}
                style={{
                  background: googleAccessToken ? '#15803d' : '#4285f4', color: '#fff', border: 'none', borderRadius: 10,
                  padding: '11px 20px', fontFamily: 'Inter,sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', justifyContent: 'center',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#fff" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" /></svg>
                {googleAccessToken ? t('Compte connecté', 'Account connected') : t('Connecter mon compte Google', 'Connect my Google account')}
              </button>
              {googleAccessToken && (
                <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(22,163,74,.08)', border: '1px solid rgba(22,163,74,.2)', borderRadius: 10, fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>
                  ✅ {t('Compte Google connecté', 'Google account connected')}
                </div>
              )}
            </div>
            <div className="info-box">
              🔒 {t("TransQi n'accède qu'à Google Forms. Vos autres données Google ne sont pas accessibles.", "TransQi only accesses Google Forms. Your other Google data isn't accessible.")}
            </div>
          </>
        )}
      </div>
      <div className="card-footer">
        <button className="btn-back" onClick={onBack}>{t('← Retour', '← Back')}</button>
        <button className="btn-next" onClick={handleContinue} disabled={isGoogle && !googleAccessToken}>
          <span>{redeployMode ? t('Redéployer', 'Redeploy') : t('Analyser le questionnaire', 'Analyse questionnaire')}</span> →
        </button>
      </div>
    </div>
  );
}
