import { useEffect, useRef, useState } from 'react';
import { useLang } from '../lib/LangContext';

const STEPS = [
  { id: 'ps1', delay: 600, fr: 'Lecture du document...', en: 'Reading document...' },
  { id: 'ps2', delay: 1800, fr: 'Identification des questions...', en: 'Identifying questions...' },
  { id: 'ps3', delay: 3200, fr: 'Détection des types de réponses...', en: 'Detecting response types...' },
  { id: 'ps4', delay: 4400, fr: 'Finalisation du formulaire...', en: 'Finalizing form...' },
];

// Meme mise en scene que l'original (paliers fixes, plafonne a 95% en attendant la vraie
// reponse) — la vraie progression en direct depuis le serveur est un chantier separe,
// volontairement mis de cote (voir discussion sur le streaming).
export default function ProcessingScreen() {
  const { t } = useLang();
  const [pct, setPct] = useState(0);
  const [activeIdx, setActiveIdx] = useState(-1);
  const timers = useRef([]);

  useEffect(() => {
    const iv = setInterval(() => setPct((p) => Math.min(p + 1, 95)), 55);
    STEPS.forEach((s, i) => {
      const timer = setTimeout(() => setActiveIdx(i), s.delay);
      timers.current.push(timer);
    });
    return () => {
      clearInterval(iv);
      timers.current.forEach(clearTimeout);
    };
  }, []);

  return (
    <div style={{ textAlign: 'center', padding: '52px 24px' }}>
      <div style={{ fontSize: 40, marginBottom: 14 }}>⚙️</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 7 }}>
        {t('Analyse en cours...', 'Analysing...')}
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
        {t('Veuillez patienter quelques instants', 'Please wait a moment')}
      </div>
      <div className="progress-bar"><div className="progress-fill" style={{ width: pct + '%' }} /></div>
      <div className="proc-steps">
        {STEPS.map((s, i) => (
          <div key={s.id} className={'proc-step' + (i === activeIdx ? ' active' : i < activeIdx ? ' done' : '')}>
            <span style={{ marginRight: 8 }}>{i < activeIdx ? '✓' : i === activeIdx ? '⚙️' : '⏳'}</span>
            <span>{t(s.fr, s.en)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
