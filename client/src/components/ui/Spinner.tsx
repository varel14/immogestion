import { cn } from '../../utils/cn.js';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

export function Spinner({ size = 'md', label, className }: SpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center gap-3', className)} role="status" aria-live="polite">
      <span
        className={cn(
          'inline-block animate-spin rounded-full border-slate-300 border-t-blue-600',
          sizeClasses[size],
        )}
      />
      {label && <span className="text-sm text-slate-500">{label}</span>}
    </div>
  );
}
