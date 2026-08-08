import { useState } from 'react';
import LogoMark from './LogoMark';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

export default function AuthModal({ open, onLogin, onSignup, onGoogleSignIn, authError, clearAuthError }) {
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [localMessage, setLocalMessage] = useState(null); // succes inscription, ou validation locale
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  function switchTab(t) {
    setTab(t);
    setLocalMessage(null);
    clearAuthError();
  }

  // Distingue "email non confirme" (avertissement, l'utilisateur doit juste verifier sa
  // boite mail) d'une vraie erreur d'identifiants ou d'un message serveur brut — memes
  // trois cas que l'original.
  let displayError = null;
  let displayColor = '#E8132A';
  if (localMessage) {
    displayError = localMessage.text;
    displayColor = localMessage.color;
  } else if (authError === 'EMAIL_NOT_CONFIRMED') {
    displayError = '⚠️ Email non confirmé. Vérifiez votre boîte mail et cliquez sur le lien de confirmation.';
    displayColor = '#E8A000';
  } else if (authError) {
    displayError = authError;
    displayColor = '#E8132A';
  }

  async function handleSubmit() {
    clearAuthError();
    setLocalMessage(null);
    if (!email.trim() || !password) {
      setLocalMessage({ text: 'Remplissez tous les champs', color: '#E8132A' });
      return;
    }
    setBusy(true);
    try {
      if (tab === 'signup') {
        const ok = await onSignup(email.trim(), password, name);
        if (ok) {
          setLocalMessage({ text: '✅ Compte créé ! Un email de confirmation vous a été envoyé. Vérifiez votre boîte mail et cliquez sur le lien avant de vous connecter.', color: '#10B981' });
          setTimeout(() => switchTab('login'), 3000);
        }
        // en cas d'erreur, authError (hook) porte deja le message precis
      } else {
        await onLogin(email.trim(), password);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,.5)', zIndex: 9999, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '90%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ margin: '0 auto 8px', width: 40 }}>
            <LogoMark size={40} color="#E8132A" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#1A1A1A' }}>TransQi Deploy</div>
          <div style={{ fontSize: 13, color: '#767676', marginTop: 4 }}>
            {tab === 'login' ? 'Connectez-vous pour continuer' : 'Créez votre compte'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            onClick={() => switchTab('login')}
            style={{ flex: 1, padding: 8, borderRadius: 8, border: '2px solid #E8132A', background: tab === 'login' ? '#E8132A' : '#fff', color: tab === 'login' ? '#fff' : '#767676', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
          >
            Connexion
          </button>
          <button
            onClick={() => switchTab('signup')}
            style={{ flex: 1, padding: 8, borderRadius: 8, border: '2px solid ' + (tab === 'signup' ? '#E8132A' : '#E8E8E8'), background: tab === 'signup' ? '#E8132A' : '#fff', color: tab === 'signup' ? '#fff' : '#767676', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
          >
            Inscription
          </button>
        </div>
        <button
          onClick={onGoogleSignIn}
          style={{ width: '100%', padding: 12, border: '1.5px solid #E8E8E8', borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 16 }}
        >
          <GoogleIcon /> Continuer avec Google
        </button>
        <div style={{ textAlign: 'center', color: '#aaa', fontSize: 12, marginBottom: 16 }}>ou</div>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E8E8E8', borderRadius: 10, fontSize: 14, marginBottom: 10, boxSizing: 'border-box' }} />
        <input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E8E8E8', borderRadius: 10, fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }} />
        {tab === 'signup' && (
          <div style={{ marginBottom: 10 }}>
            <input type="text" placeholder="Nom complet" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E8E8E8', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }} />
          </div>
        )}
        <button onClick={handleSubmit} disabled={busy} style={{ width: '100%', padding: 12, background: '#E8132A', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}>
          {tab === 'login' ? 'Se connecter' : "S'inscrire"}
        </button>
        {displayError && (
          <div style={{ color: displayColor, fontSize: 12, marginTop: 10, textAlign: 'center' }}>{displayError}</div>
        )}
      </div>
    </div>
  );
}
