import { describe, it, expect } from 'vitest';

describe('utils', () => {
  it('slugify works', () => {
    expect(slugify('Hello World')).toBe('hello-world');
    expect(slugify('  Test  ')).toBe('test');
    expect(slugify('Special!@#Chars')).toBe('specialchars');
  });

  it('truncate works', () => {
    expect(truncate('hello', 10)).toBe('hello');
    expect(truncate('hello world', 8)).toBe('hello...');
  });

  it('generateRequestId works', () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();
    expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });

  it('parseJsonSafe works', () => {
    expect(parseJsonSafe('{"a":1}', {})).toEqual({ a: 1 });
    expect(parseJsonSafe('invalid', { fallback: true })).toEqual({ fallback: true });
  });

  it('omit works', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(omit(obj, ['b'])).toEqual({ a: 1, c: 3 });
  });

  it('pick works', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });
});