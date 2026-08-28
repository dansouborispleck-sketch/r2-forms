import { useRef, useState } from 'react';
import { importFile } from '../lib/api';
import { useLang } from '../lib/LangContext';

const ACCEPT = '.pdf,.doc,.docx,.txt,.xlsx,.xls,.csv,.odt';
const MAX_SIZE = 15 * 1024 * 1024;

// status: 'idle' | 'loading' | 'success' | 'error' | 'server-down'
export default function UploadZone({ onImported, showToast }) {
  const { t, lang } = useLang();
  const [status, setStatus] = useState('idle');
  const [info, setInfo] = useState(null); // { fileName, fileSize, chars, isPdf, message }
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  async function processFile(file) {
    if (file.size > MAX_SIZE) {
      showToast(t('Fichier trop volumineux (max 15 MB)', 'File too large (max 15 MB)'));
      return;
    }
    setStatus('loading');
    try {
      const data = await importFile(file);
      if (data.images && data.images.length > 0) {
        showToast(
          t(
            `🖼️ ${data.images.length} image(s) trouvée(s) dans le document, proposées au téléchargement au déploiement`,
            `🖼️ ${data.images.length} image(s) found in the document, offered for download at deployment`
          )
        );
      }
      setStatus('success');
      setInfo({
        fileName: file.name,
        fileSize: file.size,
        isPdf: !!data.isPdf,
        chars: data.metadata?.chars ?? data.text?.length ?? 0,
      });
      onImported({
        fileContent: data.isPdf ? '' : data.text || '',
        pdfBase64Content: data.isPdf ? data.pdfBase64 : null,
        // PDF converti par LibreOffice a partir d'un DOCX cote serveur (voir /api/import) —
        // sert uniquement a l'association image -> modalite/note par position geometrique a
        // l'analyse, jamais a ce que Claude lit (qui reste fileContent ci-dessus pour un DOCX).
        layoutPdfBase64Content: data.isPdf ? null : data.layoutPdfBase64 || null,
        sourceImages: data.images || [],
        fileObject: file,
      });
    } catch (err) {
      if (err.data) {
        setStatus('error');
        setInfo({ message: err.data.message || t('Erreur de lecture', 'Read error') });
        showToast('⚠️ ' + (err.data.message || t('Erreur', 'Error')));
      } else {
        setStatus('server-down');
        showToast(t('⚠️ Erreur serveur, utilisez le champ texte', '⚠️ Server error, use the text field'));
      }
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }

  function handleFileInput(e) {
    const f = e.target.files[0];
    if (f) processFile(f);
  }

  const fileInputEl = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPT}
      onChange={handleFileInput}
      style={
        status === 'idle'
          ? { display: 'none' }
          : { position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }
      }
    />
  );

  return (
    <div
      className={'upload-zone' + (dragOver ? ' dragover' : '')}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      {status === 'idle' && (
        <>
          <div style={{ fontSize: 30, marginBottom: 8 }}>📂</div>
          <div className="upload-title">
            {t('Glissez votre fichier ici ou cliquez pour parcourir', 'Drag your file here or click to browse')}
          </div>
          <div className="upload-sub">
            {t("Questionnaire, guide d'entretien, grille d'observation...", 'Questionnaire, interview guide, observation grid...')}
          </div>
          <div className="upload-formats">
            {['PDF', 'Word', 'Excel', 'TXT', 'CSV'].map((f) => (
              <span className="fmt-tag" key={f}>{f}</span>
            ))}
          </div>
        </>
      )}
      {status === 'loading' && (
        <>
          <div style={{ fontSize: 26, marginBottom: 8 }}>⏳</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>
            {t('Lecture du fichier...', 'Reading file...')}
          </div>
        </>
      )}
      {status === 'success' && info && (
        <>
          <div style={{ fontSize: 26, marginBottom: 7 }}>✅</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>{info.fileName}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
            {(info.fileSize / 1024).toFixed(0)} KB ·{' '}
            {info.isPdf
              ? t("PDF prêt, lu directement par notre moteur d'analyse", 'PDF ready, read directly by our analysis engine')
              : `${info.chars.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US')} ${t('caractères extraits', 'characters extracted')}`}{' '}
            · {t('Cliquez pour changer', 'Click to change')}
          </div>
        </>
      )}
      {status === 'error' && info && (
        <>
          <div style={{ fontSize: 26, marginBottom: 8 }}>❌</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--red)' }}>{info.message}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
            {t('Collez le texte ci-dessous', 'Paste text below')}
          </div>
        </>
      )}
      {status === 'server-down' && (
        <>
          <div style={{ fontSize: 26, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--yellow)' }}>
            {t('Serveur non disponible', 'Server unavailable')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
            {t('Collez le texte ci-dessous', 'Paste text below')}
          </div>
        </>
      )}
      {fileInputEl}
    </div>
  );
}
