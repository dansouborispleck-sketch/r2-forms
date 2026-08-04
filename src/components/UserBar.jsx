import { useLang } from '../lib/LangContext';

export default function UserBar({ profile, onSignOut, onRecharge, onHistorique, onDeploiements }) {
  const { t } = useLang();
  if (!profile) return null;
  const solde = (profile.solde || 0).toLocaleString('fr-FR');
  const cg = profile.credit_gratuit || 0;

  return (
    <div style={{ background: '#1A1A1A', color: '#fff', padding: '8px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontWeight: 600 }}>{profile.full_name || profile.email || t('Utilisateur', 'User')}</span>
        <span style={{ color: '#aaa' }}>|</span>
        <span>{t('Solde', 'Balance')} : <strong style={{ color: '#10B981' }}>{solde} FCFA</strong></span>
        {cg > 0 && <span style={{ color: '#aaa', fontSize: 11 }}>({t('Crédit gratuit', 'Free credit')} : {cg.toLocaleString('fr-FR')} FCFA)</span>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onRecharge} className="nav-btn nav-btn-primary">+ {t('Recharger', 'Top up')}</button>
        <button onClick={onHistorique} className="nav-btn">{t('Historique', 'History')}</button>
        <button onClick={onDeploiements} className="nav-btn">{t('Mes déploiements', 'My deployments')}</button>
        <button onClick={onSignOut} className="nav-btn">{t('Déconnexion', 'Sign out')}</button>
      </div>
    </div>
  );
}
