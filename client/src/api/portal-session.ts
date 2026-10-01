/** Stockage local du token du portail client.
 *  Clé distincte de celle des employés (api/client.ts) : les deux sessions
 *  peuvent coexister (un agent peut aussi être client). */

const CLIENT_TOKEN_KEY = 'LocalBridge_client_token';

export function getClientToken(): string | null {
  return localStorage.getItem(CLIENT_TOKEN_KEY);
}

export function setClientToken(token: string): void {
  localStorage.setItem(CLIENT_TOKEN_KEY, token);
}

export function clearClientToken(): void {
  localStorage.removeItem(CLIENT_TOKEN_KEY);
}
