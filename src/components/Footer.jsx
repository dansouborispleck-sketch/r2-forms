import LogoMark from './LogoMark';
import { useLang } from '../lib/LangContext';

export default function Footer() {
  const { t } = useLang();
  return (
    <footer>
      <div className="foot-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <LogoMark size={24} color="var(--paper)" />
        Lebo
      </div>
      <div className="foot-text">
        {t(
          'La lebo qui structure et protège vos données de terrain',
          'Form conversion and deployment platform'
        )}
      </div>
      <div className="foot-copyright">
        {t('© 2026 Lebo Deploy. Tous droits réservés.', '© 2026 Lebo Deploy. All rights reserved.')}
      </div>
    </footer>
  );
}
