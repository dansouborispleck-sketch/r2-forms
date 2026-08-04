import { useLang } from '../lib/LangContext';

const STEPS = [
  { n: 1, fr: 'Import', en: 'Import' },
  { n: 2, fr: 'Connexion', en: 'Connect' },
  { n: 3, fr: 'Déploiement', en: 'Deploy' },
];

// currentStep: 1..3. Un step est "done" s'il est avant currentStep, "active" s'il l'est.
export default function StepsBar({ currentStep }) {
  const { t } = useLang();
  return (
    <div className="steps-bar">
      {STEPS.map((s, i) => {
        const done = s.n < currentStep;
        const active = s.n === currentStep;
        return (
          <>
            <div className="step" key={s.n}>
              <div className={'step-num' + (active ? ' active' : '') + (done ? ' done' : '')}>
                {done ? '✓' : s.n}
              </div>
              <div className={'step-label' + (active ? ' active' : '')}>{t(s.fr, s.en)}</div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={'step-line' + (s.n < currentStep ? ' done' : '')} key={'line' + s.n} />
            )}
          </>
        );
      })}
    </div>
  );
}
