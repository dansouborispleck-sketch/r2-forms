import { useState } from 'react';
import { lancerPaiementRecharge, lancerPaiementRechargeKora } from '../lib/payment';

const PACKS = [
  { label: 'Découverte', prix: 1000 },
  { label: 'Standard', prix: 2500, badge: 'POPULAIRE' },
  { label: 'Chercheur', prix: 5000 },
  { label: 'Institution', prix: 10000 },
  { label: 'Avancé', prix: 15000 },
  { label: 'Expert', prix: 20000 },
  { label: 'Premium', prix: 25000 },
  { label: 'Forfait Pro', prix: 30000 },
];

const CURRENCIES = [
  { value: 'XOF', label: "FCFA : Bénin, Burkina Faso, Côte d'Ivoire, Guinée, Mali, Niger, Sénégal, Togo (Mobile Money)" },
  { value: 'XAF', label: 'FCFA : Cameroun (Mobile Money / Carte)' },
  { value: 'NGN', label: 'Naira : Nigeria (Mobile Money / Carte)' },
  { value: 'GHS', label: 'Cedi : Ghana (Mobile Money / Carte)' },
  { value: 'KES', label: 'Shilling : Kenya (M-Pesa / Carte)' },
];

export default function RechargeModal({ open, onClose, email, accessToken, showToast, onCredited }) {
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
        await lancerPaiementRecharge(selectedPack.prix, selectedPack.prix, { email, accessToken, showToast, onCredited });
      } else {
        await lancerPaiementRechargeKora(selectedPack.prix, selectedPack.prix, currency, { email, accessToken, showToast, onCredited });
      }
    } finally {
      setBusy(false);
      setSelectedPack(null);
    }
  }

  return (
    <div style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,.5)', zIndex: 9999, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '90%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Recharger mon solde</div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#767676', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Pays / moyen de paiement
          </div>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{ width: '100%', border: '1.5px solid #E8E8E8', borderRadius: 10, padding: '10px 14px', fontSize: 14, outline: 'none', fontFamily: 'Inter,sans-serif' }}
          >
            {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
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
              {pack.badge && (
                <div style={{ position: 'absolute', top: -8, right: 8, background: '#E8132A', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>
                  {pack.badge}
                </div>
              )}
              <div style={{ fontSize: 13, color: '#767676', fontWeight: 600 }}>{pack.label}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#1A1A1A', margin: '4px 0' }}>{pack.prix.toLocaleString('fr-FR')}</div>
              <div style={{ fontSize: 11, color: '#aaa' }}>FCFA</div>
            </div>
          ))}
        </div>
        {selectedPack && (
          <div style={{ background: '#f8f8f8', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13 }}>
            Pack : <strong>{selectedPack.prix.toLocaleString('fr-FR')} FCFA</strong>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleClose} style={{ flex: 1, padding: 12, background: '#f0f0f0', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}>
            Annuler
          </button>
          <button
            onClick={handleProceed}
            disabled={!selectedPack || busy}
            style={{ flex: 2, padding: 12, background: '#E8132A', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: selectedPack && !busy ? 'pointer' : 'not-allowed', opacity: selectedPack && !busy ? 1 : 0.6 }}
          >
            Payer via Mobile Money
          </button>
        </div>
      </div>
    </div>
  );
}
