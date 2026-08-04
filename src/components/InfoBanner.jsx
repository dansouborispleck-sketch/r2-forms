// Encarts flottants informatifs (rapport de coherence, avertissements non bloquants) —
// distincts des toasts pour pouvoir afficher plusieurs lignes et coexister sans
// s'ecraser l'un l'autre si plusieurs se declenchent presque en meme temps (empiles
// verticalement via `offset`).
export default function InfoBanner({ title, lines, footer, color, offset, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 70 + offset * 90, left: '50%', transform: 'translateX(-50%)',
        background: color, color: '#fff', padding: '16px 20px', borderRadius: 14, fontSize: 13,
        zIndex: 9000, maxWidth: 520, lineHeight: 1.6, boxShadow: '0 4px 24px rgba(0,0,0,.3)', cursor: 'pointer',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{title}</div>
      {lines.map((line, i) => (
        <div key={i} style={{ padding: '3px 0', opacity: 0.9 }}>{lines.length > 1 ? '- ' + line : line}</div>
      ))}
      {footer && <div style={{ marginTop: 10, fontSize: 11, opacity: 0.6 }}>{footer}</div>}
    </div>
  );
}
