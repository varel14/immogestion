import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn.js';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  to?: string;
  iconClassName?: string;
}

/** Carte d'indicateur du tableau de bord. */
export function StatCard({ label, value, icon, to, iconClassName }: StatCardProps) {
  const content = (
    <div className="flex items-center gap-4">
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', iconClassName ?? 'bg-blue-50 text-blue-600')}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
      >
        {content}
      </Link>
    );
  }

  return <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">{content}</div>;
}
