import { useEffect, useState } from 'react';

export default function ProcessingScreen2({ title, sub }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setPct((p) => Math.min(p + 0.8, 90)), 60);
    return () => clearInterval(iv);
  }, []);
  return (
    <div style={{ textAlign: 'center', padding: '52px 24px' }}>
      <div style={{ fontSize: 40, marginBottom: 14 }}>⚙️</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 7 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>{sub}</div>
      <div className="progress-bar"><div className="progress-fill" style={{ width: pct + '%' }} /></div>
    </div>
  );
}
