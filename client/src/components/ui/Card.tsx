import type { ReactNode } from 'react';
import { cn } from '../../utils/cn.js';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>{children}</div>;
}
