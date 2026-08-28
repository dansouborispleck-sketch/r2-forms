import { useState } from 'react';
import { lancerPaiementRecharge, lancerPaiementRechargeKora } from '../lib/payment';
import { useLang } from '../lib/LangContext';

const PACKS = [
  { labelFr: 'Découverte', labelEn: 'Discovery', prix: 1000 },
  { labelFr: 'Standard', labelEn: 'Standard', prix: 2500, badgeFr: 'POPULAIRE', badgeEn: 'POPULAR' },
  { labelFr: 'Chercheur', labelEn: 'Researcher', prix: 5000 },
  { labelFr: 'Institution', labelEn: 'Institution', prix: 10000 },
  { labelFr: 'Avancé', labelEn: 'Advanced', prix: 15000 },
  { labelFr: 'Expert', labelEn: 'Expert', prix: 20000 },
  { labelFr: 'Premium', labelEn: 'Premium', prix: 25000 },
  { labelFr: 'Forfait Pro', labelEn: 'Pro Plan', prix: 30000 },
];

const CURRENCIES = [
  { value: 'XOF', labelFr: "FCFA : Bénin, Burkina Faso, Côte d'Ivoire, Guinée, Mali, Niger, Sénégal, Togo (Mobile Money)", labelEn: "FCFA: Benin, Burkina Faso, Côte d'Ivoire, Guinea, Mali, Niger, Senegal, Togo (Mobile Money)" },
  { value: 'XAF', labelFr: 'FCFA : Cameroun (Mobile Money / Carte)', labelEn: 'FCFA: Cameroon (Mobile Money / Card)' },
  { value: 'NGN', labelFr: 'Naira : Nigeria (Mobile Money / Carte)', labelEn: 'Naira: Nigeria (Mobile Money / Card)' },
  { value: 'GHS', labelFr: 'Cedi : Ghana (Mobile Money / Carte)', labelEn: 'Cedi: Ghana (Mobile Money / Card)' },
  { value: 'KES', labelFr: 'Shilling : Kenya (M-Pesa / Carte)', labelEn: 'Shilling: Kenya (M-Pesa / Card)' },
];

export default function RechargeModal({ open, onClose, email, accessToken, showToast, onCredited }) {
  const { t } = useLang();
  const [currency, setCurrency] = useState('XOF');
  const [selectedPack, setSelectedPack] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  function handleClose() {
    setSelectedPack(null);
    setCurrency('XOF');
    onClose();
  }

  async function handleProceed() {
    if (!selectedPack) return;
    onClose();
    setBusy(true);
    try {
      if (currency === 'XOF') {
        await lancerPaiementRecharge(selectedPack.prix, selectedPack.prix, { email, accessToken, showToast, onCredited, t });
      } else {
        await lancerPaiementRechargeKora(selectedPack.prix, selectedPack.prix, currency, { email, accessToken, showToast, onCredited, t });
      }
    } finally {
      setBusy(false);
      setSelectedPack(null);
    }
  }

  return (
    <div style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,.5)', zIndex: 9999, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '90%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{t('Recharger mon solde', 'Top up my balance')}</div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#767676', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            {t('Pays / moyen de paiement', 'Country / payment method')}
          </div>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{ width: '100%', border: '1.5px solid #E8E8E8', borderRadius: 10, padding: '10px 14px', fontSize: 14, outline: 'none', fontFamily: 'Inter,sans-serif' }}
          >
            {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{t(c.labelFr, c.labelEn)}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {PACKS.map((pack) => (
            <div
              key={pack.prix}
              className="pack-card"
              onClick={() => setSelectedPack(pack)}
              style={{
                border: '2px solid ' + (selectedPack?.prix === pack.prix ? '#E8132A' : '#E8E8E8'),
                borderRadius: 12, padding: 16, cursor: 'pointer', textAlign: 'center', position: 'relative',
              }}
            >
              {pack.badgeFr && (
                <div style={{ position: 'absolute', top: -8, right: 8, background: '#E8132A', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>
                  {t(pack.badgeFr, pack.badgeEn)}
                </div>
              )}
              <div style={{ fontSize: 13, color: '#767676', fontWeight: 600 }}>{t(pack.labelFr, pack.labelEn)}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#1A1A1A', margin: '4px 0' }}>{pack.prix.toLocaleString('fr-FR')}</div>
              <div style={{ fontSize: 11, color: '#aaa' }}>FCFA</div>
            </div>
          ))}
        </div>
        {selectedPack && (
          <div style={{ background: '#f8f8f8', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13 }}>
            {t('Pack : ', 'Plan: ')}<strong>{selectedPack.prix.toLocaleString('fr-FR')} FCFA</strong>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleClose} style={{ flex: 1, padding: 12, background: '#f0f0f0', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}>
            {t('Annuler', 'Cancel')}
          </button>
          <button
            onClick={handleProceed}
            disabled={!selectedPack || busy}
            style={{ flex: 2, padding: 12, background: '#E8132A', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: selectedPack && !busy ? 'pointer' : 'not-allowed', opacity: selectedPack && !busy ? 1 : 0.6 }}
          >
            {t('Payer via Mobile Money', 'Pay via Mobile Money')}
          </button>
        </div>
      </div>
    </div>
  );
}
