import { useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { subscribeToToasts, type ToastItem, type ToastType } from '../../utils/toast.js';
import { cn } from '../../utils/cn.js';

const typeStyles: Record<ToastType, string> = {
  success: 'text-emerald-600',
  error: 'text-red-600',
  info: 'text-indigo-600',
};

const typeIcons: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 className="h-[18px] w-[18px]" strokeWidth={1.8} />,
  error: <XCircle className="h-[18px] w-[18px]" strokeWidth={1.8} />,
  info: <Info className="h-[18px] w-[18px]" strokeWidth={1.8} />,
};

/** Pile de notifications en bas à droite : cartes bordées, auto-dismiss 4 s. */
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToToasts(setItems), []);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-full max-w-sm flex-col gap-2" role="status" aria-live="polite">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            'pointer-events-auto flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm',
          )}
        >
          <span className={cn('mt-0.5 shrink-0', typeStyles[item.type])}>{typeIcons[item.type]}</span>
          <p className="text-sm text-slate-800">{item.message}</p>
        </div>
      ))}
    </div>
  );
}
