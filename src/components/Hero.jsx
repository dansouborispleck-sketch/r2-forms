import { useLang } from '../lib/LangContext';

export default function Hero() {
  const { t } = useLang();
  return (
    <section className="hero">
      <h1>
        <span>{t('Votre questionnaire,', 'Your questionnaire,')}</span>
        <br />
        <em>{t('prêt à collecter', 'ready to collect')}</em>
      </h1>
      <p>
        {t(
          "Importez votre questionnaire existant. TransQi le convertit et le déploie directement dans votre outil de terrain.",
          'Import your existing questionnaire. TransQi converts and deploys it directly into your field tool.'
        )}
      </p>
    </section>
  );
}
