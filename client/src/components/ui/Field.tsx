import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../utils/cn.js';

/** Bloc label + champ + message d'erreur, utilisé par tous les formulaires. */
export function Field({
  label,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-[13px] font-semibold text-slate-600">
        {label}
        {required && <span className="ml-0.5 text-blue-600">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

const controlClasses = (error?: string) =>
  cn(
    'block w-full rounded-[7px] border-0 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm ring-1 ring-inset',
    'placeholder:text-slate-400 transition-shadow duration-150 focus:outline-none',
    'focus:ring-[3px] focus:ring-blue-100',
    error
      ? 'ring-red-300 focus:ring-red-100'
      : 'ring-slate-200 focus:border-blue-600 focus:ring-blue-100',
    'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400',
  );

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ error, className, ...rest }, ref) {
  return <input ref={ref} className={cn(controlClasses(error), className)} aria-invalid={!!error} {...rest} />;
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { error, className, rows = 3, ...rest },
  ref,
) {
  return <textarea ref={ref} rows={rows} className={cn(controlClasses(error), className)} aria-invalid={!!error} {...rest} />;
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ error, className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cn(controlClasses(error), 'pr-8')} aria-invalid={!!error} {...rest}>
      {children}
    </select>
  );
});
