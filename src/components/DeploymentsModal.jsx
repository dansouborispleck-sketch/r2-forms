import { useEffect, useState } from 'react';
import { sbFetch } from '../lib/supabase';
import { LANGUAGES } from '../lib/languages';
import { toolById } from '../lib/tools';

const TOOL_ICONS_DEPLOY = { kobo: '🟢', google: '📝', jotform: '🟣', excel: '📊' };
const REDEPLOY_TOOLS = ['kobo', 'google', 'jotform', 'excel'];

function Row({ analysis, onRedeploy, busy }) {
  const [targetTool, setTargetTool] = useState('kobo');
  const [targetLangCode, setTargetLangCode] = useState('');

  const date = new Date(analysis.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const deps = Array.isArray(analysis.deployments)
    ? [...analysis.deployments].sort((a, b) => new Date(b.deployed_at) - new Date(a.deployed_at))
    : [];
  const hasXlsform = !!analysis.xlsform_json;
  const deployedTools = deps.map((d) => d.outil);
  const langueLabel = analysis.langue ? LANGUAGES.find((l) => l.code === analysis.langue)?.label : null;

  return (
    <div style={{ padding: 14, border: '1px solid #f0f0f0', borderRadius: 12, marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>
        {analysis.titre || 'Questionnaire'}
        {langueLabel && <span style={{ fontWeight: 400, color: '#aaa' }}> · {langueLabel}</span>}
      </div>
      <div style={{ fontSize: 11, color: '#aaa', marginBottom: 8 }}>
        {date}{analysis.nb_questions ? ` · ${analysis.nb_questions} questions` : ''}
      </div>
      {deps.length === 0 && <div style={{ fontSize: 12, color: '#aaa', padding: '4px 0' }}>Pas encore déployé</div>}
      {deps.map((d) => (
        <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
          <span style={{ fontSize: 14 }}>{TOOL_ICONS_DEPLOY[d.outil] || '🔗'}</span>
          <span style={{ fontSize: 12, color: '#767676', flex: 1 }}>{toolById(d.outil).name}</span>
          {d.outil === 'excel'
            ? (hasXlsform && <button onClick={() => onRedeploy(analysis, 'excel', '')} style={{ background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>Retélécharger</button>)
            : (d.form_url && <a href={d.form_url} target="_blank" rel="noopener noreferrer" style={{ background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, textDecoration: 'none' }}>Accéder à</a>)}
        </div>
      ))}
      {hasXlsform ? (
        <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={targetTool} onChange={(e) => setTargetTool(e.target.value)} style={{ flex: 1, minWidth: 110, padding: 6, border: '1px solid #E8E8E8', borderRadius: 6, fontSize: 12 }}>
            {REDEPLOY_TOOLS.map((tid) => (
              <option key={tid} value={tid}>{toolById(tid).name}{deployedTools.includes(tid) ? ' (déjà déployé)' : ''}</option>
            ))}
          </select>
          <select value={targetLangCode} onChange={(e) => setTargetLangCode(e.target.value)} style={{ flex: 1, minWidth: 110, padding: 6, border: '1px solid #E8E8E8', borderRadius: 6, fontSize: 12 }}>
            <option value="">Même langue{langueLabel ? ` (${langueLabel})` : ''}</option>
            {LANGUAGES.filter((l) => l.code !== analysis.langue).map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          <button
            disabled={busy}
            onClick={() => onRedeploy(analysis, targetTool, targetLangCode)}
            style={{ background: '#E8132A', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: busy ? 'default' : 'pointer', fontWeight: 600, opacity: busy ? 0.6 : 1 }}
          >
            {busy ? '...' : 'Redéployer'}
          </button>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: '#aaa', marginTop: 8 }}>Redéploiement indisponible pour cette ancienne analyse.</div>
      )}
    </div>
  );
}

export default function DeploymentsModal({ open, onClose, user, accessToken, onRedeploy }) {
  const [analyses, setAnalyses] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!open) return;
    setAnalyses(null);
    if (!user || !accessToken) { setAnalyses([]); return; }
    sbFetch(
      `/rest/v1/analyses?user_id=eq.${user.id}&select=id,titre,created_at,nb_questions,xlsform_json,langue,deployments(id,outil,form_url,form_id,deployed_at)&order=created_at.desc&limit=30`,
      'GET', null, accessToken
    ).then((data) => setAnalyses(Array.isArray(data) ? data : []));
  }, [open, user, accessToken]);

  if (!open) return null;

  async function handleRedeploy(analysis, targetTool, targetLangCode) {
    setBusyId(analysis.id);
    try {
      await onRedeploy(analysis, targetTool, targetLangCode);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,.5)', zIndex: 9999, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '90%', maxWidth: 640, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>🚀 Mes déploiements</div>
          <button onClick={onClose} style={{ background: '#f0f0f0', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>✕ Fermer</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {analyses === null && <div style={{ textAlign: 'center', color: '#aaa', padding: 20 }}>Chargement...</div>}
          {analyses && analyses.length === 0 && (
            <div style={{ textAlign: 'center', color: '#aaa', padding: 20 }}>{!user ? 'Non connecté' : 'Aucun questionnaire analysé pour le moment'}</div>
          )}
          {analyses && analyses.map((a) => (
            <Row key={a.id} analysis={a} onRedeploy={handleRedeploy} busy={busyId === a.id} />
          ))}
        </div>
      </div>
    </div>
  );
}
