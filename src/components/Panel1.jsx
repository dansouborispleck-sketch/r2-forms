import { useState } from 'react';
import ToolGrid from './ToolGrid';
import UploadZone from './UploadZone';
import { useLang } from '../lib/LangContext';

// Panel 1 : choix de l'outil cible + import du document (fichier ou texte colle).
// selectedTool est controle par le parent (App) car il conditionne le contenu du
// panel 2 (etape suivante), pas seulement l'affichage local a ce panel.
export default function Panel1({ selectedTool, onSelectTool, onContinue, showToast }) {
  const { t } = useLang();
  const [fileContent, setFileContent] = useState('');
  const [pdfBase64Content, setPdfBase64Content] = useState(null);
  const [sourceImages, setSourceImages] = useState([]);
  const [pasteContent, setPasteContent] = useState('');

  function handleImported({ fileContent: fc, pdfBase64Content: pdf, sourceImages: imgs }) {
    setFileContent(fc);
    setPdfBase64Content(pdf);
    setSourceImages(imgs);
  }

  function handlePasteChange(e) {
    const value = e.target.value;
    setPasteContent(value);
    // La saisie manuelle est prioritaire sur un PDF deja importe (meme logique que
    // l'original : coller du texte annule l'utilisation du PDF pour l'analyse).
    if (value.trim().length > 0 && pdfBase64Content) setPdfBase64Content(null);
  }

  const ready = fileContent.length > 0 || pasteContent.trim().length > 20 || !!pdfBase64Content;

  function handleContinue() {
    onContinue({ selectedTool, fileContent, pdfBase64Content, sourceImages, pasteContent });
  }

  return (
    <div className="panel active">
      <div className="card-head">
        <div className="card-step-label">{t('Étape 1 : Votre questionnaire', 'Step 1: Your questionnaire')}</div>
        <div className="card-step-sub">
          {t("Choisissez l'outil cible et importez votre document", 'Choose the target tool and import your document')}
        </div>
      </div>
      <div style={{ padding: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 11 }}>
          {t('Outil de collecte cible', 'Target collection tool')}
        </div>
        <ToolGrid selectedTool={selectedTool} onSelect={onSelectTool} />
        <hr className="sep" />
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 11 }}>
          {t('Votre questionnaire', 'Your questionnaire')}
        </div>
        <UploadZone onImported={handleImported} showToast={showToast} />
        <div className="or-div">{t('ou collez le texte directement', 'or paste the text directly')}</div>
        <div className="paste-area">
          <textarea
            placeholder={t('Collez ici le contenu de votre questionnaire...', 'Paste your questionnaire content here...')}
            rows={5}
            value={pasteContent}
            onChange={handlePasteChange}
          />
        </div>
        <div className="char-count">
          {pasteContent.length} {t('caractères', 'characters')}
        </div>
      </div>
      <div className="card-footer">
        <button className="btn-next" disabled={!ready} onClick={handleContinue}>
          <span>{t('Continuer', 'Continue')}</span> →
        </button>
      </div>
    </div>
  );
}
