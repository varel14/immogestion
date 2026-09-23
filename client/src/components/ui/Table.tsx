import type { ReactNode } from 'react';
import { cn } from '../../utils/cn.js';

/** Ensemble de styles partagés pour les tableaux de listes. */

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead>{children}</thead>;
}

export function TH({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        'border-b border-slate-200 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-200 bg-white">{children}</tbody>;
}

export function TR({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn('transition-colors duration-150 hover:bg-slate-100', className)}>{children}</tr>;
}

export function TD({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 text-sm text-slate-700', className)}>{children}</td>;
}

/** Squelette de chargement du tableau. */
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} scope="col" className="border-b border-slate-200 px-4 py-2.5">
                <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: cols }).map((_, colIndex) => (
                <td key={colIndex} className="px-4 py-3.5">
                  <div className="h-3 animate-pulse rounded bg-slate-100" style={{ width: `${60 + ((rowIndex + colIndex) % 3) * 15}%` }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
