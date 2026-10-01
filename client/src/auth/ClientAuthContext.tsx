import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { portalApi } from '../api/portal.js';
import { clearClientToken, getClientToken, setClientToken } from '../api/portal-session.js';
import type { PortalClient } from '../api/portal.js';

interface ClientAuthContextValue {
  client: PortalClient | null;
  /** true pendant la restauration de la session au démarrage */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { firstName: string; lastName: string; email: string; phone: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshClient: () => Promise<void>;
}

const ClientAuthContext = createContext<ClientAuthContextValue | null>(null);

/** Session du portail client (site public), distincte de la session des
 *  employés de l'agence : token et contexte dédiés. */
export function ClientAuthProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<PortalClient | null>(null);
  const [loading, setLoading] = useState(true);

  // Restauration de la session au démarrage de l'application.
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      if (!getClientToken()) {
        setLoading(false);
        return;
      }
      try {
        const me = await portalApi.me();
        if (!cancelled) setClient(me);
      } catch {
        clearClientToken();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await portalApi.login(email, password);
    setClientToken(result.token);
    setClient(result.client);
  }, []);

  const register = useCallback(async (input: { firstName: string; lastName: string; email: string; phone: string; password: string }) => {
    const result = await portalApi.register(input);
    setClientToken(result.token);
    setClient(result.client);
  }, []);

  const logout = useCallback(() => {
    clearClientToken();
    setClient(null);
  }, []);

  const refreshClient = useCallback(async () => {
    const me = await portalApi.me();
    setClient(me);
  }, []);

  const value = useMemo(
    () => ({ client, loading, login, register, logout, refreshClient }),
    [client, loading, login, register, logout, refreshClient],
  );

  return <ClientAuthContext.Provider value={value}>{children}</ClientAuthContext.Provider>;
}

export function useClientAuth(): ClientAuthContextValue {
  const context = useContext(ClientAuthContext);
  if (!context) {
    throw new Error('useClientAuth doit être utilisé dans un ClientAuthProvider.');
  }
  return context;
}
