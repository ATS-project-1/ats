export interface PageParams {
  page: number;
  pageSize: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** Clamps page to >= 1 and pageSize to 1..100 (default 20). */
export function toSkipTake(params: Partial<PageParams>): {
  skip: number;
  take: number;
  page: number;
  pageSize: number;
} {
  const page = Number.isFinite(params.page) ? Math.max(1, Math.floor(params.page as number)) : 1;
  const pageSize = Number.isFinite(params.pageSize)
    ? Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(params.pageSize as number)))
    : DEFAULT_PAGE_SIZE;
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}
