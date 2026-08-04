const TOOL_URLS = {
  kobo: 'https://kf.kobotoolbox.org',
  odk: 'https://your-server.com',
  jotform: 'https://www.jotform.com/myforms/',
  xlsform: null,
  google: 'https://docs.google.com/forms',
  excel: null,
};

const ACCESS_LABELS = {
  kobo: ['Accéder à KoboToolbox', 'Open KoboToolbox'],
  odk: ['Accéder à ODK Central', 'Open ODK Central'],
  google: ['Accéder à Google Forms', 'Open Google Forms'],
  jotform: ['Accéder à JotForm', 'Open JotForm'],
  xlsform: ['Télécharger XLSForm', 'Download XLSForm'],
  excel: ['Fichier téléchargé', 'File downloaded'],
};

export default function Panel5({ selectedTool, deployedFormUrl, stats, message, xlsform, title, onRestart, showToast, t }) {
  function handleOpenAccount() {
    const url = deployedFormUrl || TOOL_URLS[selectedTool];
    if (url) window.open(url, '_blank');
    else showToast(t("Téléchargez le fichier pour l'importer", 'Download the file to import it'));
  }

  function handleDownloadFinal() {
    if (!xlsform) return;
    const blob = new Blob([JSON.stringify(xlsform, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (title || 'masque').replace(/\s+/g, '_') + '_xlsform.json';
    a.click();
  }

  const accessLabel = t(...(ACCESS_LABELS[selectedTool] || ['Accéder à ' + selectedTool, 'Open ' + selectedTool]));

  return (
    <div style={{ textAlign: 'center', padding: '52px 24px' }}>
      <div className="deploy-icon">🎉</div>
      <div className="deploy-title">{t('Masque déployé avec succès !', 'Form deployed successfully!')}</div>
      <div className="deploy-sub">{message}</div>
      <div className="deploy-stats">
        <div className="deploy-stat"><div className="deploy-stat-num">{stats.q}</div><div className="deploy-stat-label">{t('Questions', 'Questions')}</div></div>
        <div className="deploy-stat"><div className="deploy-stat-num">{stats.g}</div><div className="deploy-stat-label">{t('Groupes', 'Groups')}</div></div>
        <div className="deploy-stat"><div className="deploy-stat-num">{stats.l}</div><div className="deploy-stat-label">{t('Logiques', 'Logic')}</div></div>
      </div>
      <div className="deploy-actions">
        <button className="btn-deploy success" onClick={handleOpenAccount}>🚀 <span>{accessLabel}</span></button>
        <button className="btn-deploy secondary" onClick={handleDownloadFinal}>⬇️ <span>{t('Télécharger', 'Download')}</span></button>
        <button className="btn-deploy secondary" onClick={onRestart}>🔄 <span>{t('Nouveau questionnaire', 'New questionnaire')}</span></button>
      </div>
    </div>
  );
}
