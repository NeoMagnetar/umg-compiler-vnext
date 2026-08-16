import {
  COMPATIBILITY_MANIFEST_VERSION,
  COMPILER_VERSION,
  COMPILE_RESULT_SCHEMA_VERSION,
  DIAGNOSTIC_REGISTRY_VERSION,
  RUNTIME_HASH_PROFILE_VERSION,
  RUNTIME_SCHEMA_VERSION,
  SCHEMA_REGISTRY_VERSION,
  SELECTION_SCHEMA_VERSION,
  SLEEVE_SCHEMA_VERSION,
  TRACE_EVENT_REGISTRY_VERSION,
  TRACE_SCHEMA_VERSION,
} from './version-contract.js';

const CURRENT_COMPILER_COMPATIBILITY = {
  accepts: {
    sleeve: [SLEEVE_SCHEMA_VERSION],
    selection: [SELECTION_SCHEMA_VERSION],
  },
  emits: {
    runtime: RUNTIME_SCHEMA_VERSION,
    trace: TRACE_SCHEMA_VERSION,
    compileResult: COMPILE_RESULT_SCHEMA_VERSION,
  },
  contracts: {
    schemaRegistry: SCHEMA_REGISTRY_VERSION,
    diagnosticRegistry: DIAGNOSTIC_REGISTRY_VERSION,
    traceEventRegistry: TRACE_EVENT_REGISTRY_VERSION,
    runtimeHashProfile: RUNTIME_HASH_PROFILE_VERSION,
  },
  compatibilityPolicy: {
    exactManifestMembership: true,
    inferFromSemver: false,
    autoUpgradeLegacyInput: false,
    acceptUnknownFutureVersion: false,
  },
} as const;

const COMPILER_COMPATIBILITY_BY_VERSION = {
  [COMPILER_VERSION]: CURRENT_COMPILER_COMPATIBILITY,
} as const;

export const COMPATIBILITY_MANIFEST = {
  compatibilityManifestVersion: COMPATIBILITY_MANIFEST_VERSION,
  compilerVersions: COMPILER_COMPATIBILITY_BY_VERSION,
} as const;

export type CompilerCompatibilityEntry = typeof CURRENT_COMPILER_COMPATIBILITY;

export function getCompilerCompatibility(version: string): CompilerCompatibilityEntry | undefined {
  return (COMPILER_COMPATIBILITY_BY_VERSION as Record<string, CompilerCompatibilityEntry | undefined>)[version];
}

export function compatibilityManifestAsJson(): typeof COMPATIBILITY_MANIFEST {
  return JSON.parse(JSON.stringify(COMPATIBILITY_MANIFEST)) as typeof COMPATIBILITY_MANIFEST;
}
