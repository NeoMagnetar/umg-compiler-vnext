import { cpSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

function copyTree(source, target) {
  cpSync(source, target, { recursive: true, force: true });
}

function linkTree(source, target) {
  try {
    symlinkSync(source, target, process.platform === 'win32' ? 'junction' : 'dir');
  } catch {
    copyTree(source, target);
  }
}

export function materializeContractWorkspace({ corpusRoot, subjectRoot }) {
  const tempRoot = mkdtempSync(join(tmpdir(), 'umg-h2-'));
  copyTree(resolve(corpusRoot, 'test'), resolve(tempRoot, 'test'));
  copyTree(resolve(corpusRoot, 'fixtures'), resolve(tempRoot, 'fixtures'));
  copyTree(resolve(corpusRoot, 'schemas'), resolve(tempRoot, 'schemas'));
  copyTree(resolve(subjectRoot, 'src'), resolve(tempRoot, 'src'));
  cpSync(resolve(subjectRoot, 'package.json'), resolve(tempRoot, 'package.json'));
  linkTree(resolve(subjectRoot, 'node_modules'), resolve(tempRoot, 'node_modules'));
  copyTree(resolve(subjectRoot, 'dist'), resolve(tempRoot, 'dist'));

  return {
    root: tempRoot,
    cleanup() {
      rmSync(tempRoot, { recursive: true, force: true });
    },
  };
}
