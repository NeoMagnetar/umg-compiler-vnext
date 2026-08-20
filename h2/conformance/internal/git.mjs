import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, resolve, sep } from 'node:path';

function toGitPath(path) {
  return path.split(sep).join('/');
}

export function sha256BufferUpper(buffer) {
  return createHash('sha256').update(buffer).digest('hex').toUpperCase();
}

export function gitRevParse(repoRoot, ref = 'HEAD') {
  return execFileSync('git', ['-C', repoRoot, 'rev-parse', ref], {
    encoding: 'utf8',
    windowsHide: true,
  }).trim();
}

export function gitStatusPorcelain(repoRoot) {
  return execFileSync('git', ['-C', repoRoot, 'status', '--porcelain'], {
    encoding: 'utf8',
    windowsHide: true,
  });
}

export function gitShowBlobBuffer(repoRoot, relativePath, ref = 'HEAD') {
  return execFileSync('git', ['-C', repoRoot, 'show', `${ref}:${toGitPath(relativePath)}`], {
    encoding: 'buffer',
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
  });
}

export function gitShowBlobText(repoRoot, relativePath, ref = 'HEAD') {
  return gitShowBlobBuffer(repoRoot, relativePath, ref).toString('utf8');
}

export function readGitJson(repoRoot, relativePath, ref = 'HEAD') {
  return JSON.parse(gitShowBlobText(repoRoot, relativePath, ref));
}

export function verifyGitBlobHash(repoRoot, relativePath, expectedSha256, ref = 'HEAD') {
  const actualBytes = gitShowBlobBuffer(repoRoot, relativePath, ref);
  const actualSha256 = sha256BufferUpper(actualBytes);
  return {
    ok: actualSha256 === expectedSha256.toUpperCase(),
    path: relativePath,
    expectedSha256: expectedSha256.toUpperCase(),
    actualSha256,
    byteLength: actualBytes.length,
    ref,
  };
}

