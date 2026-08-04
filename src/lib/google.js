export const GOOGLE_CLIENT_ID = '873941698932-rk9boo1l3uccmnii866vgpsjg0pitn1t.apps.googleusercontent.com';

// L'autorisation Google Forms est une redirection PLEINE PAGE (implicit grant,
// response_type=token) : elle efface tout l'etat JS en memoire, d'ou la sauvegarde dans
// sessionStorage avant de partir et sa restauration au retour (voir consumeGoogleOAuthReturn).
// redeployAnalysis (optionnel) : present uniquement lors d'un redeploiement depuis
// l'historique (xlsform deja pret, pas de nouvelle analyse) — sans cette sauvegarde, le
// retour de redirection oubliait qu'un redeploiement etait en cours et repartait sur un
// parcours d'analyse normal (avec l'outil par defaut, Kobo).
export function startGoogleAuth({ selectedTool, fileContent, pasteContent, redeployAnalysis }) {
  const scope = 'https://www.googleapis.com/auth/forms.body';
  const redirectUri = 'https://dansouborispleck-sketch.github.io/r2-forms/';
  const authUrl =
    'https://accounts.google.com/o/oauth2/v2/auth?' +
    'client_id=' + encodeURIComponent(GOOGLE_CLIENT_ID) +
    '&redirect_uri=' + encodeURIComponent(redirectUri) +
    '&response_type=token' +
    '&scope=' + encodeURIComponent(scope) +
    '&prompt=select_account';

  sessionStorage.setItem('r2_google_auth_pending', '1');
  sessionStorage.setItem('r2_selected_tool', selectedTool);
  sessionStorage.setItem('r2_file_content', fileContent || pasteContent || '');
  if (redeployAnalysis) {
    sessionStorage.setItem('r2_redeploy_analysis', JSON.stringify(redeployAnalysis));
  } else {
    sessionStorage.removeItem('r2_redeploy_analysis');
  }

  window.location.href = authUrl;
}

// A appeler une seule fois au montage de l'app. Retourne { googleAccessToken,
// selectedTool, content, redeployAnalysis } si on revient d'une redirection OAuth Google
// reussie, sinon null. Nettoie le hash d'URL et le sessionStorage dans tous les cas ou un
// retour est detecte, pour ne pas re-consommer le meme token au prochain rendu/refresh.
export function consumeGoogleOAuthReturn() {
  const hash = window.location.hash;
  if (!hash || !hash.includes('access_token') || !sessionStorage.getItem('r2_google_auth_pending')) {
    return null;
  }
  const params = new URLSearchParams(hash.replace('#', ''));
  const token = params.get('access_token');
  if (!token) return null;

  const selectedTool = sessionStorage.getItem('r2_selected_tool') || 'google';
  const content = sessionStorage.getItem('r2_file_content') || '';
  const redeployRaw = sessionStorage.getItem('r2_redeploy_analysis');
  let redeployAnalysis = null;
  if (redeployRaw) {
    try { redeployAnalysis = JSON.parse(redeployRaw); } catch { redeployAnalysis = null; }
  }

  sessionStorage.removeItem('r2_google_auth_pending');
  sessionStorage.removeItem('r2_selected_tool');
  sessionStorage.removeItem('r2_file_content');
  sessionStorage.removeItem('r2_redeploy_analysis');
  history.replaceState(null, '', window.location.pathname);

  return { googleAccessToken: token, selectedTool, content, redeployAnalysis };
}
