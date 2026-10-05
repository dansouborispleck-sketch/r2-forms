import { useEffect, useState } from 'react';
import { sbFetch } from '../lib/supabase';
import { toolById } from '../lib/tools';
import { useLang } from '../lib/LangContext';

// Panneau lateral "Mon compte" : formulaires deja generes (reouverture, redeploiement,
// traduction) et paiements.
export default function AccountDrawer({ open, onClose, user, onReuse }) {
  const { t, lang } = useLang();
  const [tab, setTab] = useState('forms');
  const [analyses, setAnalyses] = useState(null);
  const [payments, setPayments] = useState(null);

  useEffect(() => {
    if (!open || !user) return;
    setAnalyses(null);
    setPayments(null);
    sbFetch(`/rest/v1/analyses?user_id=eq.${user.id}&xlsform_json=not.is.null&select=id,titre,created_at,nb_questions,xlsform_json,langue,deployments(id,outil,form_url,deployed_at)&order=created_at.desc&limit=30`)
      .then((d) => setAnalyses(Array.isArray(d) ? d : []));
    sbFetch(`/rest/v1/transactions?user_id=eq.${user.id}&select=*&order=created_at.desc&limit=50`)
      .then((d) => setPayments(Array.isArray(d) ? d : []));
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const fmtDate = (d) => new Date(d).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="overlay overlay-side" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={t('Mon compte', 'My account')}>
        <div className="drawer-head">
          <div>
            <h2>{t('Mon compte', 'My account')}</h2>
            <div className="muted-text">{user?.email}</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label={t('Fermer', 'Close')}>×</button>
        </div>
        <div className="seg seg-wide">
          <button className={tab === 'forms' ? 'on' : ''} onClick={() => setTab('forms')}>{t('Formulaires', 'Forms')}</button>
          <button className={tab === 'payments' ? 'on' : ''} onClick={() => setTab('payments')}>{t('Paiements', 'Payments')}</button>
        </div>
        <div className="drawer-body">
          {tab === 'forms' && (
            analyses === null ? <Loading /> : analyses.length === 0 ? <Empty text={t('Aucun formulaire pour le moment.', 'No forms yet.')} /> : (
              <ul className="list">
                {analyses.map((a) => (
                  <li key={a.id} className="list-item">
                    <div className="list-main">
                      <div className="list-title">{a.titre || t('Questionnaire', 'Questionnaire')}</div>
                      <div className="list-meta">
                        {fmtDate(a.created_at)}
                        {(a.deployments || []).map((d) => (
                          d.form_url
                            ? <a key={d.id} className="tag" href={d.form_url} target="_blank" rel="noreferrer">{toolById(d.outil).name} ↗</a>
                            : <span key={d.id} className="tag">{toolById(d.outil).name}</span>
                        ))}
                      </div>
                    </div>
                    <button className="btn btn-outline btn-sm" onClick={() => onReuse(a)}>{t('Réutiliser', 'Reuse')}</button>
                  </li>
                ))}
              </ul>
            )
          )}
          {tab === 'payments' && (
            payments === null ? <Loading /> : payments.length === 0 ? <Empty text={t('Aucun paiement.', 'No payments.')} /> : (
              <ul className="list">
                {payments.map((p) => (
                  <li key={p.id} className="list-item">
                    <div className="list-main">
                      <div className="list-title">{p.description || p.questionnaire_titre || t('Paiement', 'Payment')}</div>
                      <div className="list-meta">{fmtDate(p.created_at)}</div>
                    </div>
                    <div className="amount">{p.montant_usd != null ? `${p.montant_usd} $` : `${(p.montant || 0).toLocaleString('fr-FR')} FCFA`}</div>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      </aside>
    </div>
  );
}

function Loading() { return <div className="center-pad"><span className="spinner" /></div>; }
function Empty({ text }) { return <div className="center-pad muted-text">{text}</div>; }
