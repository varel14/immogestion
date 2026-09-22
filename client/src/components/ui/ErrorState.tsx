import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button.js';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

/** Bloc d'erreur avec bouton de réessai. */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
        <AlertCircle className="h-6 w-6 text-red-500" />
      </div>
      <p className="text-sm font-semibold text-slate-700">Une erreur est survenue</p>
      <p className="mt-1 max-w-md text-sm text-red-600">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" icon={<RefreshCw className="h-4 w-4" />} onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  );
}
