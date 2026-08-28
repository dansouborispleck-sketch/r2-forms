import LogoMark from './LogoMark';
import { useLang } from '../lib/LangContext';

export default function Footer() {
  const { t } = useLang();
  return (
    <footer>
      <div className="foot-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <LogoMark size={24} color="var(--paper)" />
        TransQi
      </div>
      <div className="foot-text">
        {t(
          'Du questionnaire au formulaire, en quelques minutes',
          'From questionnaire to form, in minutes'
        )}
      </div>
      <div className="foot-contact">
        {t('Une question, un message ? contact@transqi.com', 'A question, a message? contact@transqi.com')}
      </div>
      <div className="foot-copyright">
        {t('© 2026 TransQi Deploy. Tous droits réservés.', '© 2026 TransQi Deploy. All rights reserved.')}
      </div>
    </footer>
  );
}
