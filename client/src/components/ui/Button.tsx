import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner.js';
import { cn } from '../../utils/cn.js';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 focus-visible:outline-blue-600 disabled:bg-blue-300 shadow-sm',
  secondary:
    'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:outline-slate-400 disabled:text-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600 disabled:bg-red-300 shadow-sm',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-slate-400',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children}
    </button>
  );
}
