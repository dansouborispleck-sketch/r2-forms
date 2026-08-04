// Modalites manquantes = probleme grave (un questionnaire deploye avec des questions a
// choix vides est inutilisable) : bloque la suite tant que l'utilisateur n'a pas
// explicitement confirme avoir vu l'avertissement (comme l'original), plutot qu'un toast
// qui pourrait disparaitre pendant que l'utilisateur est deja pousse vers la suite.
export default function MissingChoicesOverlay({ message, onAcknowledge, t }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 9500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#7c2d12', color: '#fff', padding: 24, borderRadius: 16, fontSize: 14, maxWidth: 520, lineHeight: 1.6, boxShadow: '0 10px 40px rgba(0,0,0,.4)' }}>
        <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 16 }}>⚠️ {t('Questionnaire partiellement extrait', 'Questionnaire partially extracted')}</div>
        <div>{message}</div>
        <button
          onClick={onAcknowledge}
          style={{ marginTop: 16, background: '#fff', color: '#7c2d12', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
        >
          {t("J'ai compris, continuer", 'I understand, continue')}
        </button>
      </div>
    </div>
  );
}
