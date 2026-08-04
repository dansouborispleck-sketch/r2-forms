import { useCallback, useEffect, useState } from 'react';
import {
  sbFetch, signInWithGoogleUrl, consumeSupabaseOAuthReturn, restoreSessionFromStorage,
  clearSession, setTokens, getAccessToken, authFetch, SUPABASE_KEY,
} from './supabase';
import { BACKEND_URL } from './api';

// googleOAuthAlreadyHandled : true si consumeGoogleOAuthReturn() (cote outil-cible,
// App.jsx) a deja revendique le hash de l'URL courante — dans ce cas ce hook ne doit PAS
// tenter d'y lire un retour Supabase (les deux flux partagent le meme format
// #access_token=..., seul l'ordre d'appel les distingue sans ambiguite).
export function useAuth(googleOAuthAlreadyHandled) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false); // vrai une fois la restauration initiale terminee
  const [error, setError] = useState(null);

  const loadProfile = useCallback(async (currentUser) => {
    const u = currentUser || user;
    if (!u) return;
    const data = await sbFetch('/rest/v1/profiles?id=eq.' + u.id + '&select=*', 'GET', null, getAccessToken());
    if (Array.isArray(data) && data.length > 0) {
      setProfile(data[0]);
      return;
    }
    // La creation du profil (et le calcul du credit de bienvenue) se fait cote serveur
    // (voir /api/auth/init-profile) sur le statut VERIFIE de l'utilisateur — jamais une
    // valeur que le client pourrait forger en POSTant directement /rest/v1/profiles.
    try {
      const res = await authFetch(BACKEND_URL + '/api/auth/init-profile', { method: 'POST' });
      const initData = await res.json();
      if (res.ok && initData.profile) setProfile(initData.profile);
    } catch (e) {
      console.error('[PROFILE] Erreur creation profil:', e);
    }
  }, [user]);

  useEffect(() => {
    (async () => {
      // Toujours finir par setReady(true), meme si un appel reseau echoue (coupure,
      // demarrage a froid du backend...) — sinon la modale de connexion ne s'affiche
      // jamais et l'utilisateur reste bloque sans aucune indication.
      try {
        if (!googleOAuthAlreadyHandled) {
          const viaOAuth = await consumeSupabaseOAuthReturn();
          if (viaOAuth) {
            setUser(viaOAuth.user);
            await loadProfile(viaOAuth.user);
            return;
          }
        }
        const restored = restoreSessionFromStorage();
        if (restored) {
          setUser(restored.user);
          await loadProfile(restored.user);
        }
      } catch (e) {
        console.error('[AUTH] Erreur initialisation session:', e);
      } finally {
        setReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    const result = await sbFetch('/auth/v1/token?grant_type=password', 'POST', { email, password }, SUPABASE_KEY);
    if (result.error || result.error_description) {
      setError(result.error_description || result.error || 'Erreur');
      return false;
    }
    if (!result.access_token) {
      setError(result.error_description || 'Erreur de connexion');
      return false;
    }
    if (result.user && !result.user.email_confirmed_at && result.user.app_metadata?.provider === 'email') {
      setError('EMAIL_NOT_CONFIRMED');
      return false;
    }
    setTokens(result.access_token, result.refresh_token || null);
    localStorage.setItem('lebo_token', result.access_token);
    if (result.refresh_token) localStorage.setItem('lebo_refresh', result.refresh_token);
    localStorage.setItem('lebo_user', JSON.stringify(result.user));
    setUser(result.user);
    await loadProfile(result.user);
    return true;
  }, [loadProfile]);

  const signup = useCallback(async (email, password, fullName) => {
    setError(null);
    const result = await sbFetch('/auth/v1/signup', 'POST', { email, password, data: { full_name: fullName } }, SUPABASE_KEY);
    if (result.error || result.error_description) {
      setError(result.error_description || result.error || 'Erreur');
      return false;
    }
    return true; // email de confirmation envoye
  }, []);

  const signOut = useCallback(async () => {
    await sbFetch('/auth/v1/logout', 'POST', {}, getAccessToken());
    clearSession();
    setUser(null);
    setProfile(null);
  }, []);

  const signInWithGoogle = useCallback(() => {
    window.location.href = signInWithGoogleUrl();
  }, []);

  return { user, profile, ready, error, setError, login, signup, signOut, signInWithGoogle, loadProfile, accessToken: getAccessToken() };
}
