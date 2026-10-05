import LogoMark from './LogoMark';
import { useLang } from '../lib/LangContext';

export default function Nav({ user, profile, onLogin, onSignup, onAccount, onSignOut }) {
  const { t, lang, setLang } = useLang();
  const name = profile?.full_name || user?.user_metadata?.full_name || user?.email || '';

  return (
    <nav className="nav">
      <div className="nav-inner">
        <a href="#top" className="brand">
          <LogoMark size={28} />
          <span>TransQi</span>
        </a>
        <div className="nav-right">
          <div className="seg" role="group" aria-label="Langue">
            <button className={lang === 'fr' ? 'on' : ''} onClick={() => setLang('fr')}>FR</button>
            <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
          </div>
          {user ? (
            <>
              <button className="link" onClick={onAccount}>{t('Mon compte', 'My account')}</button>
              <span className="avatar" title={name}>{(name[0] || '?').toUpperCase()}</span>
              <button className="link muted" onClick={onSignOut}>{t('Déconnexion', 'Sign out')}</button>
            </>
          ) : (
            <>
              <button className="link" onClick={onLogin}>{t('Se connecter', 'Sign in')}</button>
              <button className="btn btn-dark btn-sm" onClick={onSignup}>{t("S'inscrire", 'Sign up')}</button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
