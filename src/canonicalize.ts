import { createHash } from 'node:crypto';

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalize);
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));

    return Object.fromEntries(entries.map(([key, child]) => [key, normalize(child)]));
  }

  return value;
}

export function canonicalize(value: unknown): string {
  return JSON.stringify(normalize(value));
}

export function sha256Canonical(value: unknown): string {
  return createHash('sha256').update(canonicalize(value)).digest('hex');
}
