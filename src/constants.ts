import type { MoltType } from './types.js';

export const MOLT_AUTHORITY_ORDER: readonly MoltType[] = [
  'trigger',
  'directive',
  'instruction',
  'subject',
  'primary',
  'philosophy',
  'blueprint',
];

/** Trigger is intentionally excluded from vNext Merge experimentation. */
export const MERGE_AUTHORITY_ORDER = [
  'directive',
  'instruction',
  'subject',
  'primary',
  'philosophy',
  'blueprint',
] as const;

export const SCOPED_MOLT_TYPES = ['instruction', 'philosophy', 'blueprint'] as const;
