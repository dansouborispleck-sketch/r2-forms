import { toolById } from '../lib/tools';
import { useLang } from '../lib/LangContext';

// Acces au compte de l'outil CIBLE (Kobo/ODK/JotForm/Google). A ne pas confondre avec le
// compte TransQi. Identifiants jamais conserves.
export default function ToolAccess({ tool, credentials, onChange, onGoogleConnect }) {
  const { t } = useLang();
  const info = toolById(tool);
  const set = (k) => (e) => onChange({ ...credentials, [k]: e.target.value });

  if (tool === 'excel') {
    return <p className="muted-text">{t('Aucun accès requis : le fichier Excel sera téléchargé.', 'No access needed: the Excel file will be downloaded.')}</p>;
  }

  if (tool === 'google') {
    return (
      <div className="stack">
        <button className={'btn btn-block ' + (credentials.googleAccessToken ? 'btn-success' : 'btn-outline')} onClick={onGoogleConnect} type="button">
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="currentColor" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" /></svg>
          {credentials.googleAccessToken ? t('Compte Google connecté', 'Google account connected') : t('Connecter mon compte Google', 'Connect my Google account')}
        </button>
        <p className="hint">{t('Accès limité à Google Forms.', 'Access limited to Google Forms.')}</p>
      </div>
    );
  }

  if (tool === 'jotform') {
    return (
      <div className="stack">
        <label className="field">
          <span>{t('Clé API JotForm (Full Access)', 'JotForm API key (Full Access)')}</span>
          <input type="text" value={credentials.apiKey} onChange={set('apiKey')} placeholder="••••••••••••" autoComplete="off" />
        </label>
        <p className="hint">
          {t('JotForm → Paramètres → API → Créer une nouvelle clé.', 'JotForm → Settings → API → Create New Key.')}{' '}
          <a href="https://www.jotform.com/myaccount/api" target="_blank" rel="noreferrer">{t('Ouvrir', 'Open')} ↗</a>
        </p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="grid-2">
        <label className="field">
          <span>{t("Nom d'utilisateur ou email", 'Username or email')}</span>
          <input type="text" autoComplete="username" value={credentials.username} onChange={set('username')} />
        </label>
        <label className="field">
          <span>{t('Mot de passe', 'Password')}</span>
          <input type="password" autoComplete="current-password" value={credentials.password} onChange={set('password')} />
        </label>
      </div>
      {tool === 'odk' && (
        <label className="field">
          <span>{t('URL du serveur', 'Server URL')}</span>
          <input type="url" placeholder="https://" value={credentials.server} onChange={set('server')} />
        </label>
      )}
      <p className="hint">
        {t('Utilisés uniquement pour déposer le formulaire, jamais conservés.', 'Only used to deploy the form, never stored.')}
        {info.signupUrl && (
          <> · <a href={info.signupUrl} target="_blank" rel="noreferrer">{t('Créer un compte', 'Create an account')} {info.name} ↗</a></>
        )}
      </p>
    </div>
  );
}
