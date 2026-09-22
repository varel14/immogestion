import axios from 'axios';

/** Clé de stockage local du token de session. */
export const TOKEN_KEY = 'immogestion_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Session expirée ou invalide : retour à la page de connexion,
    // sauf si l'erreur provient de la tentative de connexion elle-même.
    const isLoginCall = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && getToken() && !isLoginCall) {
      clearToken();
      window.location.href = '/connexion';
    }
    return Promise.reject(error);
  },
);

/** Extrait un message d'erreur compréhensible en français. */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
    if (error.code === 'ERR_NETWORK') {
      return 'Impossible de contacter le serveur. Vérifiez que le serveur backend est démarré.';
    }
    return 'Une erreur inattendue est survenue. Veuillez réessayer.';
  }
  return 'Une erreur inattendue est survenue. Veuillez réessayer.';
}
