import LogoMark from './LogoMark';
import { useLang } from '../lib/LangContext';

export default function Footer() {
  const { t } = useLang();
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="brand"><LogoMark size={22} /><span>TransQi</span></div>
        <div className="muted-text">{t('Paiement sécurisé par carte bancaire via Gumroad', 'Secure card payment via Gumroad')}</div>
        <a href="mailto:contact@transqi.com" className="muted-text">contact@transqi.com</a>
        <div className="muted-text">© 2026 TransQi</div>
      </div>
    </footer>
  );
}
