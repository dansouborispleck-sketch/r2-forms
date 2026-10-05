import { useEffect, useState } from 'react';
import { useLang } from '../lib/LangContext';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

// Fenetre de connexion/inscription ouverte depuis la barre du haut (ou au clic sur
// "Generer" sans etre connecte). Toujours fermable : la page reste consultable sans compte.
export default function AuthDialog({ mode, onModeChange, onClose, onLogin, onSignup, onGoogleSignIn, authError, clearAuthError }) {
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [notice, setNotice] = useState(null); // { text, tone }
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!mode) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, onClose]);

  if (!mode) return null;
  const isSignup = mode === 'signup';

  function switchMode(m) {
    setNotice(null);
    clearAuthError();
    onModeChange(m);
  }

  let error = null;
  if (notice) error = notice;
  else if (authError === 'EMAIL_NOT_CONFIRMED') error = { text: t('Email non confirmé. Cliquez sur le lien reçu par email.', 'Email not confirmed. Click the link sent to your inbox.'), tone: 'warn' };
  else if (authError) error = { text: authError, tone: 'error' };

  async function handleSubmit(e) {
    e.preventDefault();
    clearAuthError();
    setNotice(null);
    if (!email.trim() || !password) {
      setNotice({ text: t('Remplissez tous les champs.', 'Fill in all fields.'), tone: 'error' });
      return;
    }
    setBusy(true);
    try {
      if (isSignup) {
        const ok = await onSignup(email.trim(), password, name);
        if (ok) setNotice({ text: t('Compte créé. Confirmez votre email puis connectez-vous.', 'Account created. Confirm your email, then sign in.'), tone: 'ok' });
      } else if (await onLogin(email.trim(), password)) {
        onClose();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="icon-btn dialog-close" onClick={onClose} aria-label={t('Fermer', 'Close')}>×</button>
        <h2 id="auth-title">{isSignup ? t('Créer un compte', 'Create an account') : t('Bon retour', 'Welcome back')}</h2>
        <p className="dialog-sub">
          {isSignup
            ? t('Votre premier formulaire est offert.', 'Your first form is free.')
            : t('Connectez-vous pour générer vos formulaires.', 'Sign in to generate your forms.')}
        </p>
        <button className="btn btn-outline btn-block" onClick={onGoogleSignIn} type="button">
          <GoogleIcon /> {t('Continuer avec Google', 'Continue with Google')}
        </button>
        <div className="divider"><span>{t('ou', 'or')}</span></div>
        <form onSubmit={handleSubmit} className="stack">
          {isSignup && (
            <label className="field">
              <span>{t('Nom complet', 'Full name')}</span>
              <input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            <span>{t('Mot de passe', 'Password')}</span>
            <input type="password" autoComplete={isSignup ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <div className={'note note-' + error.tone}>{error.text}</div>}
          <button className="btn btn-primary btn-block" disabled={busy} type="submit">
            {busy ? <span className="spinner" /> : isSignup ? t('Créer mon compte', 'Create my account') : t('Se connecter', 'Sign in')}
          </button>
        </form>
        <p className="dialog-foot">
          {isSignup ? t('Déjà un compte ?', 'Already have an account?') : t('Pas encore de compte ?', 'No account yet?')}{' '}
          <button className="link" onClick={() => switchMode(isSignup ? 'login' : 'signup')}>
            {isSignup ? t('Se connecter', 'Sign in') : t("S'inscrire", 'Sign up')}
          </button>
        </p>
      </div>
    </div>
  );
}
