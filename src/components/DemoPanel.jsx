import { useState } from 'react';
import { useLang } from '../lib/LangContext';

const SHORT = `Enquête sur l'accès à l'eau potable — Commune de Dassa
Q1. Nom du village
Q2. Nombre de personnes vivant dans le ménage
Q3. Source principale d'eau de boisson : 1) Forage 2) Puits 3) Rivière 4) Autre
Q4. Si autre, précisez
Q5. Temps pour aller chercher l'eau (en minutes)
Q6. Le ménage traite-t-il l'eau avant de la boire ? 1) Oui 2) Non
Q7. Si oui, quelle méthode ? 1) Chlore 2) Ébullition 3) Filtre
Q8. Un enfant de moins de 5 ans a-t-il eu la diarrhée ces 2 dernières semaines ? 1) Oui 2) Non
Q9. Le ménage possède-t-il des latrines ? 1) Oui 2) Non
Q10. Commentaires de l'enquêteur`;

const LONG = ['Recensement agricole détaillé — Département des Collines']
  .concat(Array.from({ length: 140 }, (_, i) => `Q${i + 1}. ${[
    'Superficie cultivée (ha)', 'Culture principale : 1) Maïs 2) Manioc 3) Igname 4) Coton', 'Nombre d\'actifs agricoles',
    'Accès au crédit agricole : 1) Oui 2) Non', 'Quantité récoltée (kg)', 'Utilisation d\'engrais : 1) Oui 2) Non', 'Prix de vente moyen (FCFA/kg)',
  ][i % 7]} — parcelle ${Math.floor(i / 7) + 1}`))
  .join('\n');

// Panneau de la version de demonstration uniquement : exemples prets a l'emploi.
export default function DemoPanel({ onSample }) {
  const { t } = useLang();
  const [open, setOpen] = useState(true);
  if (!open) {
    return <button className="demo-fab" onClick={() => setOpen(true)}>{t('Démo', 'Demo')}</button>;
  }
  return (
    <aside className="demo-panel" aria-label={t('Démonstration', 'Demo')}>
      <div className="demo-head">
        <strong>{t('Démonstration', 'Demo')}</strong>
        <button className="icon-btn" onClick={() => setOpen(false)} aria-label={t('Réduire', 'Collapse')}>×</button>
      </div>
      <p>{t('Serveur simulé : le paiement est confirmé automatiquement après 5 secondes. Mot de passe Kobo « faux » pour simuler une erreur.',
        'Simulated server: payment is confirmed automatically after 5 seconds. Kobo password "faux" simulates an error.')}</p>
      <div className="demo-actions">
        <button className="btn btn-outline btn-sm" onClick={() => onSample(SHORT)}>{t('Exemple : 10 questions', 'Sample: 10 questions')}</button>
        <button className="btn btn-outline btn-sm" onClick={() => onSample(LONG)}>{t('Exemple : 140 questions', 'Sample: 140 questions')}</button>
      </div>
    </aside>
  );
}
