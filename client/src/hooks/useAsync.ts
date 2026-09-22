import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { getApiErrorMessage } from '../api/client.js';

interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: string | undefined;
}

/** Exécute une requête asynchrone (annulable) et expose son état :
 *  chargement, erreur française et données. `reload` relance la requête. */
export function useAsync<T>(fn: (signal: AbortSignal) => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({ loading: true, error: undefined, data: undefined });
  const [tick, setTick] = useState(0);
  // Référence mise à jour à chaque rendu pour toujours appeler la dernière version de fn.
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    const controller = new AbortController();
    setState((previous) => ({ data: previous.data, loading: true, error: undefined }));

    fnRef
      .current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setState({ data, loading: false, error: undefined });
        }
      })
      .catch((error) => {
        if (controller.signal.aborted || axios.isCancel(error)) return;
        setState({ data: undefined, loading: false, error: getApiErrorMessage(error) });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  return { ...state, reload };
}
