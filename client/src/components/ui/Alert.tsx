import type { ReactNode } from 'react';
import { cn } from '../../utils/cn.js';

type AlertVariant = 'info' | 'success' | 'error';

const variantClasses: Record<AlertVariant, string> = {
  info: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  error: 'bg-red-50 text-red-700 ring-red-600/20',
};

/** Bandeau de message (succès, info, erreur). */
export function Alert({ variant = 'info', children }: { variant?: AlertVariant; children: ReactNode }) {
  return (
    <div className={cn('rounded-lg px-4 py-3 text-sm ring-1 ring-inset', variantClasses[variant])} role="alert">
      {children}
    </div>
  );
}
