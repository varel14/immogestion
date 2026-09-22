import { useEffect, useState } from 'react';

/** Renvoie la valeur après un délai sans changement (400 ms par défaut).
 *  Utilisé pour déclencher les recherches côté serveur. */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
