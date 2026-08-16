declare module 'node:crypto' {
  export function createHash(algorithm: string): {
    update(data: string): { digest(encoding: 'hex'): string };
    digest(encoding: 'hex'): string;
  };
}

declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function writeFileSync(path: string, data: string, encoding: 'utf8'): void;
}

declare const process: {
  argv: string[];
  exitCode?: number;
  stdout: { write(data: string): void };
  stderr: { write(data: string): void };
};
