export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** bornes acceptées pour la pagination */
const MIN_PAGE = 1;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 10;

export function parsePagination(query: { page?: unknown; pageSize?: unknown }): PaginationParams {
  const page = Math.max(MIN_PAGE, Number.parseInt(String(query.page ?? '1'), 10) || MIN_PAGE);
  const requested = Number.parseInt(String(query.pageSize ?? DEFAULT_PAGE_SIZE), 10);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.isNaN(requested) ? DEFAULT_PAGE_SIZE : requested));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function buildPaginationMeta(total: number, page: number, pageSize: number): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
