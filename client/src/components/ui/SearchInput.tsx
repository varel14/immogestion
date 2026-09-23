import { Search, X } from 'lucide-react';
import { cn } from '../../utils/cn.js';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/** Champ de recherche avec icône et bouton d'effacement. */
export function SearchInput({ value, onChange, placeholder = 'Rechercher...', className }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="block w-full rounded-[7px] border-0 bg-white py-2 pr-8 pl-9 text-sm text-slate-800 shadow-sm ring-1 ring-slate-200 ring-inset transition-shadow placeholder:text-slate-400 focus:outline-none focus:ring-[3px] focus:ring-blue-100"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
          aria-label="Effacer la recherche"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
