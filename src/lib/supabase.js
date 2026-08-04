export const SUPABASE_URL = 'https://ysnmnasyngjbycdzubcp.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_DJWonC2DgWdNyn8VeGHkqQ_M8VYSsG9';

// Jeton d'acces Supabase courant, tenu en dehors de React (comme l'original) pour que
// sbFetch puisse toujours lire la valeur la plus fraiche sans etre lui-meme un hook.
let _accessToken = null;
let _refreshToken = null;

export function setTokens(accessToken, refreshToken) {
  _accessToken = accessToken;
  _refreshToken = refreshToken || _refreshToken;
}
export function getAccessToken() { return _accessToken; }

// Le jeton d'acces Supabase expire au bout d'environ 1h. Rafraichit via le refresh_token
// et persiste le nouveau jeton (meme logique que l'original, memes clefs localStorage
// pour rester compatible si l'utilisateur bascule entre l'ancien et le nouveau site).
async function refreshAccessToken() {
  if (!_refreshToken) return false;
  try {
    const r = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
      body: JSON.stringify({ refresh_token: _refreshToken }),
    });
    const data = await r.json();
    if (!r.ok || !data.access_token) return false;
    _accessToken = data.access_token;
    _refreshToken = data.refresh_token || _refreshToken;
    localStorage.setItem('lebo_token', _accessToken);
    localStorage.setItem('lebo_refresh', _refreshToken);
    return true;
  } catch (e) {
    console.error('[AUTH] Erreur rafraichissement du jeton:', e);
    return false;
  }
}

export async function sbFetch(path, method, body, token, extraHeaders, _isRetry) {
  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_KEY,
    Authorization: 'Bearer ' + (token || _accessToken || SUPABASE_KEY),
  };
  if (extraHeaders) Object.assign(headers, extraHeaders);
  const r = await fetch(SUPABASE_URL + path, {
    method: method || 'GET',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  // Sur 401/403 (jeton expire), tente UNE fois un rafraichissement + nouvelle tentative
  // — jamais pour les endpoints /auth/v1/ eux-memes (un mauvais mot de passe ne doit pas
  // declencher une boucle de rafraichissement), et jamais pour un appel utilisant
  // volontairement une cle differente (token !== _accessToken).
  if ((r.status === 401 || r.status === 403) && !_isRetry && (token === _accessToken || !token) && path.indexOf('/auth/v1/') !== 0) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return sbFetch(path, method, body, _accessToken, extraHeaders, true);
  }
  try { return await r.json(); } catch { return {}; }
}

export function signInWithGoogleUrl() {
  const redirectUrl = encodeURIComponent(window.location.href.split('#')[0]);
  return SUPABASE_URL + '/auth/v1/authorize?provider=google&redirect_to=' + redirectUrl;
}

// A appeler au montage, APRES avoir tente consumeGoogleOAuthReturn() (les deux flux
// utilisent le meme format de hash #access_token=... — seul l'ordre d'appel et le drapeau
// sessionStorage cote outil-cible permettent de les distinguer sans ambiguite).
export async function consumeSupabaseOAuthReturn() {
  const hash = window.location.hash;
  if (!hash || !hash.includes('access_token')) return null;
  const params = new URLSearchParams(hash.substring(1));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token') || null;
  if (!accessToken) return null;

  setTokens(accessToken, refreshToken);
  const userData = await sbFetch('/auth/v1/user', 'GET', null, accessToken);
  if (!userData || !userData.id) return null;

  localStorage.setItem('lebo_token', accessToken);
  if (refreshToken) localStorage.setItem('lebo_refresh', refreshToken);
  localStorage.setItem('lebo_user', JSON.stringify(userData));
  window.history.replaceState(null, '', window.location.pathname);
  return { accessToken, refreshToken, user: userData };
}

export function restoreSessionFromStorage() {
  const token = localStorage.getItem('lebo_token');
  const user = localStorage.getItem('lebo_user');
  const refresh = localStorage.getItem('lebo_refresh');
  if (!token || !user) return null;
  setTokens(token, refresh);
  try {
    return { accessToken: token, refreshToken: refresh, user: JSON.parse(user) };
  } catch {
    return null;
  }
}

export function clearSession() {
  setTokens(null, null);
  localStorage.removeItem('lebo_token');
  localStorage.removeItem('lebo_refresh');
  localStorage.removeItem('lebo_user');
}
