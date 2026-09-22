import type { ReactNode } from 'react';
import { cn } from '../../utils/cn.js';

interface BadgeProps {
  children: ReactNode;
  className?: string;
}

/** Pastille colorée (statut, rôle...). Passer la classe de couleur via className. */
export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap',
        className ?? 'bg-slate-100 text-slate-700 ring-slate-500/20',
      )}
    >
      {children}
    </span>
  );
}
