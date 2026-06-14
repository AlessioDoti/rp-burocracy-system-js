import { describe, it, expect } from '@jest/globals';
import { Page, buildPageable } from '../../../../src/domain/dto/Page.js';

describe('Page', () => {
  it('builds a page with computed totalPages', () => {
    const page = new Page(['a', 'b'], 0, 10, 25);
    expect(page.data).toEqual(['a', 'b']);
    expect(page.page).toBe(0);
    expect(page.size).toBe(10);
    expect(page.total).toBe(25);
    expect(page.totalPages).toBe(3); // ceil(25/10)
  });

  it('returns 0 totalPages when size is 0', () => {
    const page = new Page([], 0, 0, 100);
    expect(page.totalPages).toBe(0);
  });

  it('serialises via toJSON', () => {
    const page = new Page(['x'], 1, 5, 5);
    expect(page.toJSON()).toEqual({
      data: ['x'],
      page: 1,
      size: 5,
      total: 5,
      totalPages: 1
    });
  });
});

describe('buildPageable', () => {
  it('returns defaults when no query is provided', () => {
    const result = buildPageable();
    expect(result.page).toBe(0);
    expect(result.size).toBe(20);
    expect(result.offset).toBe(0);
    expect(result.sort).toBeNull();
  });

  it('parses page and size from raw values', () => {
    const result = buildPageable({ page: '2', size: '10' });
    expect(result.page).toBe(2);
    expect(result.size).toBe(10);
    expect(result.offset).toBe(20);
  });

  it('clamps page to minimum 0', () => {
    expect(buildPageable({ page: '-5' }).page).toBe(0);
  });

  it('clamps size to [1, 200]', () => {
    // size=0: Number.parseInt('0',10) || 20 → falls back to DEFAULT_PAGE_SIZE (20)
    expect(buildPageable({ size: '0' }).size).toBe(20);
    expect(buildPageable({ size: '500' }).size).toBe(200);
  });

  it('parses sort field and direction', () => {
    const result = buildPageable({ sort: 'name,desc' });
    expect(result.sort).toEqual({ field: 'name', direction: 'desc' });
  });

  it('defaults direction to asc when missing or unknown', () => {
    expect(buildPageable({ sort: 'name' }).sort.direction).toBe('asc');
    expect(buildPageable({ sort: 'name,foo' }).sort.direction).toBe('asc');
  });

  it('returns null sort when sort string is empty', () => {
    expect(buildPageable({ sort: '' }).sort).toBeNull();
  });
});
