import { createHash } from 'node:crypto';

function compareKeys(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function unsupportedValue(path, reason) {
  throw new TypeError(`Cannot canonicalize ${path}: ${reason}`);
}

function normalize(value, path = '$') {
  if (value === undefined) {
    unsupportedValue(path, 'undefined is not supported');
  }

  if (Array.isArray(value)) {
    return Array.from({ length: value.length }, (_, index) => {
      const entry = value[index];
      if (!(index in value) || entry === undefined) {
        unsupportedValue(`${path}[${index}]`, 'undefined array entries are invalid');
      }
      return normalize(entry, `${path}[${index}]`);
    });
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => compareKeys(left, right));

    return Object.fromEntries(entries.map(([key, child]) => [key, normalize(child, `${path}.${key}`)]));
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      unsupportedValue(path, 'NaN and Infinity are not supported');
    }
    return Object.is(value, -0) ? 0 : value;
  }

  if (typeof value === 'bigint') {
    unsupportedValue(path, 'BigInt is not supported');
  }

  if (typeof value === 'function') {
    unsupportedValue(path, 'function is not supported');
  }

  if (typeof value === 'symbol') {
    unsupportedValue(path, 'symbol is not supported');
  }

  return value;
}

export function canonicalize(value) {
  return JSON.stringify(normalize(value));
}

export function sha256Canonical(value) {
  return createHash('sha256').update(canonicalize(value)).digest('hex').toUpperCase();
}

