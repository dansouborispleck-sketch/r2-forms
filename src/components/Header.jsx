import LogoMark from './LogoMark';
import { useLang } from '../lib/LangContext';

export default function Header() {
  const { lang, setLang } = useLang();
  return (
    <header>
      <div className="logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <LogoMark size={36} />
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.5px' }}>
          Lebo <span className="logo-tag">DEPLOY</span>
        </span>
      </div>
      <div className="lang-toggle">
        <button className={'lang-btn' + (lang === 'fr' ? ' active' : '')} onClick={() => setLang('fr')}>FR</button>
        <button className={'lang-btn' + (lang === 'en' ? ' active' : '')} onClick={() => setLang('en')}>EN</button>
      </div>
    </header>
  );
}
