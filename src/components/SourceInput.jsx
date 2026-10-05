import { useRef, useState } from 'react';
import { importFile } from '../lib/api';
import { useLang } from '../lib/LangContext';

const ACCEPT = '.pdf,.doc,.docx,.txt,.xlsx,.xls,.csv,.odt';
const MAX_SIZE = 15 * 1024 * 1024;

// Depot de fichier OU texte colle. Remonte un "source" complet au parent a chaque
// changement : { fileContent, pdfBase64Content, docxLayoutBlocksContent, sourceImages,
// pasteContent, fileName }.
export default function SourceInput({ source, onChange }) {
  const { t } = useLang();
  const [status, setStatus] = useState('idle'); // idle | loading | error
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  async function processFile(file) {
    if (file.size > MAX_SIZE) {
      setStatus('error');
      setError(t('Fichier trop volumineux (15 Mo max).', 'File too large (15 MB max).'));
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const data = await importFile(file);
      onChange({
        fileName: file.name,
        fileContent: data.isPdf ? '' : data.text || '',
        pdfBase64Content: data.isPdf ? data.pdfBase64 : null,
        docxLayoutBlocksContent: data.isPdf ? null : data.docxLayoutBlocks || null,
        sourceImages: data.images || [],
        pasteContent: '',
      });
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(err.data?.message || t('Lecture impossible. Collez le texte ci-dessous.', 'Could not read the file. Paste the text below.'));
    }
  }

  function clearFile(e) {
    e.stopPropagation();
    if (inputRef.current) inputRef.current.value = '';
    onChange({ ...source, fileName: null, fileContent: '', pdfBase64Content: null, docxLayoutBlocksContent: null, sourceImages: [] });
  }

  function handlePaste(e) {
    const value = e.target.value;
    // Coller du texte remplace un fichier deja importe (le texte est prioritaire).
    onChange(value.trim()
      ? { fileName: null, fileContent: '', pdfBase64Content: null, docxLayoutBlocksContent: null, sourceImages: [], pasteContent: value }
      : { ...source, pasteContent: value });
  }

  return (
    <div className="stack">
      <div
        className={'drop' + (dragOver ? ' over' : '') + (source.fileName ? ' filled' : '')}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
      >
        <input ref={inputRef} type="file" accept={ACCEPT} hidden onChange={(e) => { const f = e.target.files[0]; if (f) processFile(f); }} />
        {status === 'loading' ? (
          <span className="spinner spinner-lg" />
        ) : source.fileName ? (
          <div className="file-chip">
            <FileIcon />
            <span className="file-name">{source.fileName}</span>
            <button className="icon-btn" onClick={clearFile} aria-label={t('Retirer', 'Remove')}>×</button>
          </div>
        ) : (
          <>
            <UploadIcon />
            <div className="drop-title">{t('Déposez votre questionnaire', 'Drop your questionnaire')}</div>
            <div className="drop-sub">{t('ou cliquez pour parcourir', 'or click to browse')} · PDF, Word, Excel, TXT, CSV</div>
          </>
        )}
      </div>
      {status === 'error' && error && <div className="note note-error">{error}</div>}
      <div className="divider"><span>{t('ou collez le texte', 'or paste the text')}</span></div>
      <textarea
        className="textarea"
        rows={5}
        placeholder={t('Collez ici le contenu de votre questionnaire…', 'Paste your questionnaire here…')}
        value={source.pasteContent}
        onChange={handlePaste}
      />
    </div>
  );
}

function UploadIcon() {
  return (
    <svg className="drop-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 16V4m0 0-4 4m4-4 4 4" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" />
    </svg>
  );
}
