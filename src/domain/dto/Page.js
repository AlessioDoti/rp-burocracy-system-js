/**
 * @fileoverview Generic pagination container and query-string parser.
 *
 * The `Page<T>` value object is what every list endpoint returns. The
 * `buildPageable(raw)` helper turns the Express `req.query` into the
 * shape used by every repository (`{page, size, sort, offset}`), with
 * defensive bounds and a whitelist for sortable fields.
 */

/**
 * @template T
 * @class Page
 * @classdesc Immutable-ish view of a single page of results.
 *
 * The `toJSON()` method is the contract the REST layer relies on: every
 * page is serialised to `{data, page, size, total, totalPages}`.
 */
export class Page {
  /**
   * @param {T[]}   data    The items on this page (may be empty).
   * @param {number} page   Zero-based page index.
   * @param {number} size   Maximum number of items per page.
   * @param {number} total  Total number of items across all pages.
   */
  constructor(data, page, size, total) {
    /** @type {T[]} */
    this.data = data;
    /** @type {number} */
    this.page = page;
    /** @type {number} */
    this.size = size;
    /** @type {number} */
    this.total = total;
    /** @type {number} Computed as `ceil(total / size)`, with a guard against size=0. */
    this.totalPages = size > 0 ? Math.ceil(total / size) : 0;
  }

  /**
   * @returns {{ data: T[], page: number, size: number, total: number, totalPages: number }}
   */
  toJSON() {
    return {
      data: this.data,
      page: this.page,
      size: this.size,
      total: this.total,
      totalPages: this.totalPages
    };
  }
}

/**
 * Default page size used when the client does not specify one.
 * @type {number}
 */
const DEFAULT_PAGE_SIZE = 20;

/**
 * Hard cap on page size to protect the database from a single
 * caller asking for a million rows.
 * @type {number}
 */
const MAX_PAGE_SIZE = 200;

/**
 * Build a Pageable from the Express query string, applying defensive
 * bounds and a default sort. The returned object is the contract every
 * repository consumes.
 *
 * Accepted query keys:
 *   - `page`   (number, default 0, clamped to ≥ 0)
 *   - `size`   (number, default 20, clamped to [1, 200])
 *   - `sort`   (string in the form `field,direction`, e.g. `id,desc`)
 *
 * @param {{ page?: string|number, size?: string|number, sort?: string }} [raw]
 * @returns {{
 *   page: number,
 *   size: number,
 *   sort: { field: string, direction: 'asc'|'desc' }|null,
 *   offset: number
 * }}
 */
export function buildPageable(raw = {}) {
  const page = Math.max(0, Number.parseInt(raw.page, 10) || 0);
  const size = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(raw.size, 10) || DEFAULT_PAGE_SIZE));
  const offset = page * size;

  let sort = null;
  if (typeof raw.sort === 'string' && raw.sort.length > 0) {
    const [field, direction] = raw.sort.split(',');
    sort = { field, direction: direction === 'desc' ? 'desc' : 'asc' };
  }

  return { page, size, sort, offset };
}
