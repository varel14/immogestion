import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '../../types/index.js';
import { cn } from '../../utils/cn.js';

interface PublicPaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

/** Pagination numérotée du site public (style Airbnb). */
export function PublicPagination({ meta, onPageChange }: PublicPaginationProps) {
  const { page, totalPages } = meta;
  if (totalPages <= 1) return null;

  // Fenêtre glissante : autour de la page courante, avec les extrémités.
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const items: (number | '…')[] = [];
  sorted.forEach((p, index) => {
    if (index > 0 && p - sorted[index - 1] > 1) items.push('…');
    items.push(p);
  });

  const base =
    'inline-flex h-10 min-w-10 items-center justify-center rounded-[8px] px-3 text-sm font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';

  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Pagination des annonces">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Page précédente"
        className={cn(base, 'text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent')}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {items.map((item, index) =>
        item === '…' ? (
          <span key={`ellipsis-${index}`} className="px-1 text-sm text-slate-400">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-current={item === page ? 'page' : undefined}
            className={cn(
              base,
              'tabular-nums',
              item === page ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100',
            )}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Page suivante"
        className={cn(base, 'text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent')}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
