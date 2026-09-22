import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '../../types/index.js';
import { Button } from './Button.js';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

/** Pagination « X–Y sur Z » avec navigation précédent / suivant. */
export function Pagination({ meta, onPageChange }: PaginationProps) {
  const { page, pageSize, total, totalPages } = meta;
  if (total === 0) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
      <p className="text-xs text-slate-500">
        {first}–{last} sur <span className="font-medium text-slate-700">{total}</span> résultat{total > 1 ? 's' : ''}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">
          Page {page} sur {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Page précédente"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Page suivante"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
