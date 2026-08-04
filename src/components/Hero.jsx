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
          "Importez votre questionnaire existant. Lebo convertit et déploie votre questionnaire directement dans votre outil de terrain.",
          'Import your existing questionnaire. Lebo converts and deploys your questionnaire directly into your field tool.'
        )}
      </p>
    </section>
  );
}
