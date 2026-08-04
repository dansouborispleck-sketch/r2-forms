import { useEffect, useState } from 'react';
import { sbFetch } from '../lib/supabase';

export default function HistoriqueModal({ open, onClose, user, accessToken }) {
  const [transactions, setTransactions] = useState(null); // null = chargement

  useEffect(() => {
    if (!open) return;
    setTransactions(null);
    if (!user || !accessToken) { setTransactions([]); return; }
    sbFetch(`/rest/v1/transactions?user_id=eq.${user.id}&select=*&order=created_at.desc&limit=50`, 'GET', null, accessToken)
      .then((data) => setTransactions(Array.isArray(data) ? data : []));
  }, [open, user, accessToken]);

  if (!open) return null;

  return (
    <div style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,.5)', zIndex: 9999, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '90%', maxWidth: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>📋 Historique des transactions</div>
          <button onClick={onClose} style={{ background: '#f0f0f0', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>✕ Fermer</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {transactions === null && <div style={{ textAlign: 'center', color: '#aaa', padding: 20 }}>Chargement...</div>}
          {transactions && transactions.length === 0 && (
            <div style={{ textAlign: 'center', color: '#aaa', padding: 20 }}>{!user ? 'Non connecté' : 'Aucune transaction pour le moment'}</div>
          )}
          {transactions && transactions.map((tx) => {
            const date = new Date(tx.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            const isDebit = tx.type === 'debit';
            const isGratuit = tx.type === 'bonus_gratuit';
            const icon = isDebit ? '📤' : isGratuit ? '🎁' : '📥';
            const color = isDebit ? '#E8132A' : '#10B981';
            const sign = isDebit ? '-' : '+';
            const label = isDebit ? (tx.questionnaire_titre || 'Analyse') : isGratuit ? 'Crédit gratuit' : 'Recharge Mobile Money';
            return (
              <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontSize: 20 }}>{icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#aaa' }}>{date}</div>
                  {tx.nb_questions ? <div style={{ fontSize: 11, color: '#767676' }}>{tx.nb_questions} questions</div> : null}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color }}>{sign}{(tx.montant || 0).toLocaleString('fr-FR')} FCFA</div>
                  <div style={{ fontSize: 11, color: '#aaa' }}>Solde : {(tx.solde_apres || 0).toLocaleString('fr-FR')} FCFA</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
