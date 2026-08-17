import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileSleeve, validateSelection, validateSleeve } from '../dist/index.js';
import {
  DIAGNOSTIC_REGISTRY,
  validateDiagnosticAgainstRegistry,
} from '../dist/diagnostic-registry.js';
import {
  finalizeCompileResultForInternalTest,
} from '../dist/compile.js';
import { resolveSleeve } from '../dist/resolve.js';
import {
  structurallyValidateCompileResult,
  structurallyValidateRuntimeSpec,
  structurallyValidateSelection,
  structurallyValidateSleeve,
  structurallyValidateTrace,
} from '../dist/schema-validation.js';
import {
  validateCanonicalSelection,
  validateCanonicalSleeve,
} from '../dist/validate.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

function json(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const HISTORICAL_C1_DIRECT_CODES = [
  'CONTROLLER_HAS_PARENT',
  'DIRECTIVE_BASE_GEOMETRY_CANON_VIOLATION',
  'DUPLICATE_BUNDLE_ID',
  'DUPLICATE_MERGE_RESULT',
  'DUPLICATE_MODULE_ROW',
  'DUPLICATE_SECONDARY_DIRECTIVE_ID',
  'GOVERNANCE_RULE_NO_TARGETS',
  'INVALID_ENUM_VALUE',
  'INVALID_MERGE_RESULT',
  'INVALID_MERGE_SOURCE',
  'INVALID_PRIME_DIRECTIVE',
  'INVALID_SECONDARY_DIRECTIVE_BLOCK',
  'INVALID_SECONDARY_TRIGGER_BLOCK',
  'LANE_MEMBER_TYPE_MISMATCH',
  'MERGE_AUTHORITY_ESCALATION',
  'MERGE_CHAIN_UNSUPPORTED',
  'MERGE_CYCLE',
  'MERGE_DUPLICATE_SOURCE',
  'MERGE_RESULT_IS_SOURCE',
  'MERGE_RESULT_NOT_PLACED',
  'MERGE_RESULT_SCOPED_UNSUPPORTED',
  'MERGE_TOO_FEW_SOURCES',
  'MISSING_REQUIRED_FIELD',
  'MULTIPLE_NEOSTACK_PARENTS',
  'MULTIPLE_SECONDARY_DIRECTIVE_MATCH',
  'NEOBLOCK_IN_MULTIPLE_NEOSTACKS',
  'NEOBLOCK_WITHOUT_NEOSTACK',
  'NEOSTACK_CYCLE',
  'NONCONTIGUOUS_MODULE_ROWS',
  'ORPHAN_LOCAL_DIRECTIVE',
  'ORPHAN_NEOSTACK',
  'PRIME_AS_SECONDARY_DIRECTIVE',
  'SCOPED_MOLT_TYPE_UNSUPPORTED',
  'SELECTION_MISSING_ANCESTOR',
  'SELECTION_NEOBLOCK_CONTAINER_NOT_SELECTED',
  'SELECTION_TARGET_NOT_EXECUTABLE',
  'STRUCTURAL_SCHEMA_VIOLATION',
  'TRIGGER_BOUND_TO_MULTIPLE_SECONDARIES',
  'TRIGGER_MERGE_UNSUPPORTED',
  'TRIGGER_STATE_TYPE_MISMATCH',
  'UNKNOWN_ACTIVE_GOVERNANCE_RULE',
  'UNKNOWN_ACTIVE_OVERLAY',
  'UNKNOWN_BUNDLE_REFERENCE',
  'UNKNOWN_CHILD_NEOSTACK',
  'UNKNOWN_CONTROLLER_NEOSTACK',
  'UNKNOWN_FIELD',
  'UNKNOWN_GOVERNANCE_NEOBLOCK_TARGET',
  'UNKNOWN_GOVERNANCE_NEOSTACK_TARGET',
  'UNKNOWN_SCOPED_NEOSTACK',
  'UNKNOWN_TRIGGER_STATE_ID',
  'UNSUPPORTED_SELECTION_SCHEMA',
  'UNSUPPORTED_SLEEVE_SCHEMA',
];

const POST_C1_DIRECT_CODES = [
  'SELECTION_NEOBLOCK_CONTAINER_UNKNOWN',
];

const EXPECTED_NEW_C2A_DIRECT_CODES = [
  'ACTIVE_NEOSTACK_OUTSIDE_CONTROLLER_TREE',
  'ARRAY_TOO_SHORT',
  'BUNDLE_REFERENCE_TYPE_MISMATCH',
  'CONTROLLER_NOT_SELECTED',
  'DUPLICATE_GEOMETRY_MEMBER',
  'DUPLICATE_GEOMETRY_ROW',
  'DUPLICATE_GLOBAL_ID',
  'DUPLICATE_LOCAL_MOLT_ID',
  'DUPLICATE_MERGE_ID',
  'DUPLICATE_MODULE_ROW_MEMBER',
  'DUPLICATE_OVERLAY_ID',
  'DUPLICATE_SELECTION_ID',
  'EMPTY_GEOMETRY',
  'EMPTY_GEOMETRY_ROW',
  'EMPTY_MODULE_ROW',
  'INTERNAL_COMPILER_ERROR',
  'INTERNAL_OUTPUT_CONTRACT_VIOLATION',
  'INVALID_COMPILED_AT',
  'INVALID_CONST_VALUE',
  'INVALID_FIELD_FORMAT',
  'INVALID_FIELD_TYPE',
  'INVALID_GEOMETRY_ROW',
  'INVALID_MODULE_ROW',
  'INVALID_NUMERIC_RANGE',
  'INVALID_ROUTE_RATIONALE',
  'INVALID_UNION_SHAPE',
  'NONCONTIGUOUS_GEOMETRY_ROWS',
  'NONLOCAL_GEOMETRY_MEMBER',
  'NO_TRIGGER_MATCH_FOR_ACTIVE_NEOBLOCK',
  'REQUIRED_BASE_LANE_MISSING',
  'REQUIRED_MOLT_MISSING',
  'SELECTION_NEOBLOCK_CONTAINER_NOT_EXECUTABLE',
  'STRING_TOO_SHORT',
  'UNKNOWN_ACTIVE_NEOBLOCK',
  'UNKNOWN_ACTIVE_NEOSTACK',
  'UNKNOWN_DISABLED_NEOBLOCK',
  'UNKNOWN_DISABLED_NEOSTACK',
  'UNKNOWN_LOCAL_MOLT_BLOCK',
  'UNKNOWN_MOLT_BLOCK',
  'UNKNOWN_NEOBLOCK_IN_NEOSTACK',
  'UNKNOWN_SCOPED_MOLT_BLOCK',
  'UNREACHABLE_LOCAL_MOLT_BLOCK',
  'UNSUPPORTED_COMPILE_RESULT_SCHEMA',
  'UNSUPPORTED_RUNTIME_SCHEMA',
  'UNSUPPORTED_TRACE_SCHEMA',
];

const newC2ADirectCodes = new Set();

function assertFailureEnvelope(result, terminalStage) {
  assert.equal(result.status, 'failure');
  assert.equal(result.hasErrors, true);
  assert.equal(result.runtime, null);
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.level === 'error'));
  if (terminalStage === null) {
    assert.equal(result.trace, null);
  } else {
    assert.ok(result.trace, 'expected failure trace');
    assert.equal(result.trace.terminalStage, terminalStage);
    assert.deepEqual(result.trace.diagnostics, result.diagnostics);
  }
}

function assertDiagnostic(diagnostics, expected) {
  const entry = DIAGNOSTIC_REGISTRY[expected.code];
  assert.ok(entry, `missing registry entry for ${expected.code}`);

  const diagnostic = diagnostics.find(
    (item) =>
      item.code === expected.code &&
      item.subject?.kind === expected.subjectKind &&
      (!Object.hasOwn(expected, 'subjectId') ||
        expected.subjectId === null ||
        item.subject?.id === expected.subjectId),
  );
  assert.ok(
    diagnostic,
    `missing diagnostic ${expected.code} with subject ${expected.subjectKind}:${expected.subjectId ?? '<none>'}`,
  );

  assert.equal(diagnostic.level, entry.level);
  assert.equal(diagnostic.stage, entry.stage);
  assert.equal(diagnostic.subject.kind, expected.subjectKind);
  assert.ok(entry.allowedSubjectKinds.includes(diagnostic.subject.kind));

  if (Object.hasOwn(expected, 'subjectId')) {
    if (expected.subjectId === null) {
      assert.equal(diagnostic.subject.id, undefined);
    } else {
      assert.equal(diagnostic.subject.id, expected.subjectId);
    }
  }

  for (const key of entry.requiredDetailKeys) {
    assert.notEqual(
      diagnostic.details?.[key],
      undefined,
      `diagnostic ${expected.code} must include details.${key}`,
    );
  }

  for (const [key, value] of Object.entries(expected.details ?? {})) {
    assert.deepEqual(diagnostic.details?.[key], value, `diagnostic ${expected.code} details.${key}`);
  }

  assert.deepEqual(validateDiagnosticAgainstRegistry(diagnostic), []);
  newC2ADirectCodes.add(expected.code);
  return diagnostic;
}

function runCase(testCase) {
  const diagnostics = testCase.run();
  const diagnostic = assertDiagnostic(diagnostics, testCase);
  testCase.assert?.(diagnostic, diagnostics);
}

const dealershipSleeve = json('fixtures/dealership.sleeve.json');
const normalSelection = json('fixtures/requests/normal.selection.json');
const stateSleeve = json('fixtures/state-selection.sleeve.json');
const closedSelection = json('fixtures/requests/state-selection-closed.selection.json');
const bundleOverlaySleeve = json('fixtures/bundle-overlay.sleeve.json');
const mergeContractSleeve = json('fixtures/merge-contract.sleeve.json');

const cleanCompile = compileSleeve(dealershipSleeve, normalSelection);
assert.equal(cleanCompile.status, 'success');
assert.ok(cleanCompile.runtime);
assert.ok(cleanCompile.trace);

function clonedInstructionBlock(sleeve, id, newId) {
  const block = sleeve.moltBlocks.find((item) => item.id === id);
  assert.ok(block, `missing MOLT block ${id}`);
  return { ...clone(block), id: newId };
}

const structuralCases = [
  {
    name: 'sleeve array minimum maps to ARRAY_TOO_SHORT',
    code: 'ARRAY_TOO_SHORT',
    subjectKind: 'sleeve',
    subjectId: 'SLV.DEALERSHIP.GOLDEN.v0.1',
    details: { documentKind: 'sleeve' },
    run: () => {
      const sleeve = clone(dealershipSleeve);
      sleeve.neoStacks = [];
      const result = compileSleeve(sleeve, normalSelection);
      assertFailureEnvelope(result, null);
      assertDiagnostic(result.diagnostics, {
        code: 'ARRAY_TOO_SHORT',
        subjectKind: 'sleeve',
        subjectId: 'SLV.DEALERSHIP.GOLDEN.v0.1',
      });
      return structurallyValidateSleeve(sleeve).diagnostics;
    },
  },
  {
    name: 'runtime const violation maps to INVALID_CONST_VALUE',
    code: 'INVALID_CONST_VALUE',
    subjectKind: 'runtime',
    subjectId: 'SLV.DEALERSHIP.GOLDEN.v0.1',
    details: { documentKind: 'runtime', received: 'active' },
    run: () => {
      const runtime = clone(cleanCompile.runtime);
      runtime.resetPlan.targetState = 'active';
      return structurallyValidateRuntimeSpec(runtime).diagnostics;
    },
  },
  {
    name: 'selection date-time format maps to INVALID_FIELD_FORMAT',
    code: 'INVALID_FIELD_FORMAT',
    subjectKind: 'selection',
    subjectId: null,
    details: { documentKind: 'selection', format: 'date-time' },
    run: () => {
      const selection = clone(normalSelection);
      selection.compiledAt = 'not-a-date';
      const result = compileSleeve(dealershipSleeve, selection);
      assertFailureEnvelope(result, null);
      return structurallyValidateSelection(selection).diagnostics;
    },
  },
  {
    name: 'selection object type violation maps to INVALID_FIELD_TYPE',
    code: 'INVALID_FIELD_TYPE',
    subjectKind: 'selection',
    subjectId: null,
    details: { documentKind: 'selection', receivedType: 'array' },
    run: () => {
      const selection = clone(normalSelection);
      selection.triggerState = [];
      const result = compileSleeve(dealershipSleeve, selection);
      assertFailureEnvelope(result, null);
      return structurallyValidateSelection(selection).diagnostics;
    },
  },
  {
    name: 'sleeve row minimum maps to INVALID_NUMERIC_RANGE',
    code: 'INVALID_NUMERIC_RANGE',
    subjectKind: 'sleeve',
    subjectId: 'SLV.DEALERSHIP.GOLDEN.v0.1',
    details: { documentKind: 'sleeve', minimum: 1 },
    run: () => {
      const sleeve = clone(dealershipSleeve);
      sleeve.neoStacks[0].neoBlockRows[0].row = 0;
      const result = compileSleeve(sleeve, normalSelection);
      assertFailureEnvelope(result, null);
      return structurallyValidateSleeve(sleeve).diagnostics;
    },
  },
  {
    name: 'scope union violation maps to INVALID_UNION_SHAPE',
    code: 'INVALID_UNION_SHAPE',
    subjectKind: 'sleeve',
    subjectId: 'SLV.DEALERSHIP.GOLDEN.v0.1',
    details: { documentKind: 'sleeve' },
    run: () => {
      const sleeve = clone(dealershipSleeve);
      sleeve.scopedMolt[0].scope = { kind: 'bogus' };
      const result = compileSleeve(sleeve, normalSelection);
      assertFailureEnvelope(result, null);
      return structurallyValidateSleeve(sleeve).diagnostics;
    },
  },
  {
    name: 'empty sleeve id maps to STRING_TOO_SHORT',
    code: 'STRING_TOO_SHORT',
    subjectKind: 'sleeve',
    subjectId: null,
    details: { documentKind: 'sleeve', minimumLength: 1 },
    run: () => {
      const sleeve = clone(dealershipSleeve);
      sleeve.id = '';
      const result = compileSleeve(sleeve, normalSelection);
      assertFailureEnvelope(result, null);
      return structurallyValidateSleeve(sleeve).diagnostics;
    },
  },
  {
    name: 'compile result schema version maps to UNSUPPORTED_COMPILE_RESULT_SCHEMA',
    code: 'UNSUPPORTED_COMPILE_RESULT_SCHEMA',
    subjectKind: 'compile_result',
    subjectId: 'SLV.DEALERSHIP.GOLDEN.v0.1',
    details: { documentKind: 'compileResult', received: 'unsupported' },
    run: () => {
      const result = clone(cleanCompile);
      result.schemaVersion = 'unsupported';
      return structurallyValidateCompileResult(result).diagnostics;
    },
  },
  {
    name: 'runtime schema version maps to UNSUPPORTED_RUNTIME_SCHEMA',
    code: 'UNSUPPORTED_RUNTIME_SCHEMA',
    subjectKind: 'runtime',
    subjectId: 'SLV.DEALERSHIP.GOLDEN.v0.1',
    details: { documentKind: 'runtime', received: 'unsupported' },
    run: () => {
      const runtime = clone(cleanCompile.runtime);
      runtime.schemaVersion = 'unsupported';
      return structurallyValidateRuntimeSpec(runtime).diagnostics;
    },
  },
  {
    name: 'trace schema version maps to UNSUPPORTED_TRACE_SCHEMA',
    code: 'UNSUPPORTED_TRACE_SCHEMA',
    subjectKind: 'trace',
    subjectId: 'SLV.DEALERSHIP.GOLDEN.v0.1',
    details: { documentKind: 'trace', received: 'unsupported' },
    run: () => {
      const trace = clone(cleanCompile.trace);
      trace.schemaVersion = 'unsupported';
      return structurallyValidateTrace(trace).diagnostics;
    },
  },
];

for (const testCase of structuralCases) runCase(testCase);

const semanticCases = [
  {
    name: 'secondary directive bundle lane type mismatch',
    code: 'BUNDLE_REFERENCE_TYPE_MISMATCH',
    subjectKind: 'secondary_directive',
    subjectId: 'SD.TARGET.B',
    run: () => {
      const sleeve = clone(bundleOverlaySleeve);
      const target = sleeve.neoBlocks.find((item) => item.id === 'NB.TARGET');
      target.secondaryDirectives[0].bundles.instruction = 'BND.TARGET.B.PH';
      return validateSleeve(sleeve).diagnostics;
    },
  },
  {
    name: 'selection omits controller',
    code: 'CONTROLLER_NOT_SELECTED',
    subjectKind: 'selection',
    subjectId: null,
    run: () => {
      const selection = clone(normalSelection);
      selection.activeNeoStackIds = ['NS.SERVICE'];
      const result = compileSleeve(dealershipSleeve, selection);
      assertFailureEnvelope(result, 'semantic');
      return validateSelection(dealershipSleeve, selection).diagnostics;
    },
  },
  {
    name: 'geometry repeats member across rows',
    code: 'DUPLICATE_GEOMETRY_MEMBER',
    subjectKind: 'neoblock',
    subjectId: 'NB.CONTROLLER.INTAKE',
    run: () => {
      const sleeve = clone(dealershipSleeve);
      sleeve.neoBlocks[0].baseGeometry.instruction.push({ row: 2, blockIds: ['I.CTRL.INTERPRET'] });
      return validateSleeve(sleeve).diagnostics;
    },
  },
  {
    name: 'geometry repeats row number',
    code: 'DUPLICATE_GEOMETRY_ROW',
    subjectKind: 'neoblock',
    subjectId: 'NB.CONTROLLER.INTAKE',
    run: () => {
      const sleeve = clone(dealershipSleeve);
      sleeve.moltBlocks.push(clonedInstructionBlock(sleeve, 'I.CTRL.INTERPRET', 'I.CTRL.EXTRA'));
      sleeve.neoBlocks[0].moltBlockIds.push('I.CTRL.EXTRA');
      sleeve.neoBlocks[0].baseGeometry.instruction.push({ row: 1, blockIds: ['I.CTRL.EXTRA'] });
      return validateSleeve(sleeve).diagnostics;
    },
  },
  {
    name: 'global id table catches cross-type duplicate',
    code: 'DUPLICATE_GLOBAL_ID',
    subjectKind: 'sleeve',
    subjectId: 'SLV.DEALERSHIP.GOLDEN.v0.1',
    run: () => {
      const sleeve = clone(dealershipSleeve);
      sleeve.scopedMolt[0].id = 'T.CTRL.DEFAULT';
      return validateSleeve(sleeve).diagnostics;
    },
  },
  {
    name: 'local MOLT list repeats id',
    code: 'DUPLICATE_LOCAL_MOLT_ID',
    subjectKind: 'neoblock',
    subjectId: 'NB.CONTROLLER.INTAKE',
    run: () => {
      const sleeve = clone(dealershipSleeve);
      sleeve.neoBlocks[0].moltBlockIds.push('T.CTRL.DEFAULT');
      return validateCanonicalSleeve(sleeve).diagnostics;
    },
  },
  {
    name: 'merge list repeats id',
    code: 'DUPLICATE_MERGE_ID',
    subjectKind: 'neoblock',
    subjectId: 'NB.MRG.CONTRACT',
    run: () => {
      const sleeve = clone(mergeContractSleeve);
      const neoBlock = sleeve.neoBlocks.find((item) => item.id === 'NB.MRG.CONTRACT');
      neoBlock.merges.push({ ...clone(neoBlock.merges[0]), resultBlockId: 'I.MRG.RESULT.REUSE' });
      return validateSleeve(sleeve).diagnostics;
    },
  },
  {
    name: 'module row repeats child member',
    code: 'DUPLICATE_MODULE_ROW_MEMBER',
    subjectKind: 'neostack',
    subjectId: 'NS.CONTROLLER',
    run: () => {
      const sleeve = clone(dealershipSleeve);
      sleeve.neoStacks[0].childStackRows.push({ row: 2, neoStackIds: ['NS.SERVICE'] });
      return validateSleeve(sleeve).diagnostics;
    },
  },
  {
    name: 'overlay list repeats id',
    code: 'DUPLICATE_OVERLAY_ID',
    subjectKind: 'overlay',
    subjectId: 'OV.A',
    run: () => {
      const sleeve = clone(bundleOverlaySleeve);
      sleeve.overlays[1].id = sleeve.overlays[0].id;
      return validateSleeve(sleeve).diagnostics;
    },
  },
  {
    name: 'canonical selection repeats id',
    code: 'DUPLICATE_SELECTION_ID',
    subjectKind: 'selection',
    subjectId: null,
    run: () => {
      const selection = clone(normalSelection);
      selection.activeNeoStackIds.push('NS.SERVICE');
      return validateCanonicalSelection(dealershipSleeve, selection).diagnostics;
    },
  },
  {
    name: 'canonical geometry rows empty',
    code: 'EMPTY_GEOMETRY',
    subjectKind: 'neoblock',
    subjectId: 'NB.CONTROLLER.INTAKE',
    run: () => {
      const sleeve = clone(dealershipSleeve);
      sleeve.neoBlocks[0].baseGeometry.instruction = [];
      return validateCanonicalSleeve(sleeve).diagnostics;
    },
  },
  {
    name: 'canonical geometry row empty',
    code: 'EMPTY_GEOMETRY_ROW',
    subjectKind: 'neoblock',
    subjectId: 'NB.CONTROLLER.INTAKE',
    run: () => {
      const sleeve = clone(dealershipSleeve);
      sleeve.neoBlocks[0].baseGeometry.instruction[0].blockIds = [];
      return validateCanonicalSleeve(sleeve).diagnostics;
    },
  },
  {
    name: 'canonical module row empty',
    code: 'EMPTY_MODULE_ROW',
    subjectKind: 'neostack',
    subjectId: 'NS.CONTROLLER',
    run: () => {
      const sleeve = clone(dealershipSleeve);
      sleeve.neoStacks[0].neoBlockRows[0].neoBlockIds = [];
      return validateCanonicalSleeve(sleeve).diagnostics;
    },
  },
  {
    name: 'canonical selection compiledAt parse failure',
    code: 'INVALID_COMPILED_AT',
    subjectKind: 'selection',
    subjectId: null,
    run: () => {
      const selection = clone(normalSelection);
      selection.compiledAt = 'not-a-date';
      return validateCanonicalSelection(dealershipSleeve, selection).diagnostics;
    },
  },
  {
    name: 'canonical geometry row number invalid',
    code: 'INVALID_GEOMETRY_ROW',
    subjectKind: 'neoblock',
    subjectId: 'NB.CONTROLLER.INTAKE',
    run: () => {
      const sleeve = clone(dealershipSleeve);
      sleeve.neoBlocks[0].baseGeometry.instruction[0].row = 0;
      return validateCanonicalSleeve(sleeve).diagnostics;
    },
  },
  {
    name: 'canonical module row number invalid',
    code: 'INVALID_MODULE_ROW',
    subjectKind: 'neostack',
    subjectId: 'NS.CONTROLLER',
    run: () => {
      const sleeve = clone(dealershipSleeve);
      sleeve.neoStacks[0].neoBlockRows[0].row = 0;
      return validateCanonicalSleeve(sleeve).diagnostics;
    },
  },
  {
    name: 'canonical selection routeRationale type violation',
    code: 'INVALID_ROUTE_RATIONALE',
    subjectKind: 'selection',
    subjectId: null,
    run: () => {
      const selection = clone(normalSelection);
      selection.routeRationale = 'string-rationale';
      return validateCanonicalSelection(dealershipSleeve, selection).diagnostics;
    },
  },
  {
    name: 'geometry rows skip row one',
    code: 'NONCONTIGUOUS_GEOMETRY_ROWS',
    subjectKind: 'neoblock',
    subjectId: 'NB.CONTROLLER.INTAKE',
    run: () => {
      const sleeve = clone(dealershipSleeve);
      sleeve.neoBlocks[0].baseGeometry.instruction[0].row = 2;
      return validateSleeve(sleeve).diagnostics;
    },
  },
  {
    name: 'geometry references non-local MOLT block',
    code: 'NONLOCAL_GEOMETRY_MEMBER',
    subjectKind: 'neoblock',
    subjectId: 'NB.SERVICE.TRIAGE',
    run: () => {
      const sleeve = clone(dealershipSleeve);
      sleeve.neoBlocks[1].baseGeometry.instruction[0].blockIds.push('I.CTRL.INTERPRET');
      return validateSleeve(sleeve).diagnostics;
    },
  },
  {
    name: 'canonical required base lane absent',
    code: 'REQUIRED_BASE_LANE_MISSING',
    subjectKind: 'neoblock',
    subjectId: 'NB.CONTROLLER.INTAKE',
    run: () => {
      const sleeve = clone(dealershipSleeve);
      delete sleeve.neoBlocks[0].baseGeometry.primary;
      return validateCanonicalSleeve(sleeve).diagnostics;
    },
  },
  {
    name: 'local authority missing required MOLT type',
    code: 'REQUIRED_MOLT_MISSING',
    subjectKind: 'neoblock',
    subjectId: 'NB.CONTROLLER.INTAKE',
    details: { moltType: 'primary' },
    run: () => {
      const sleeve = clone(dealershipSleeve);
      sleeve.neoBlocks[0].moltBlockIds = sleeve.neoBlocks[0].moltBlockIds.filter((id) => id !== 'P.CTRL.ROUTE');
      return validateSleeve(sleeve).diagnostics;
    },
  },
  {
    name: 'selection active NeoBlock unknown',
    code: 'UNKNOWN_ACTIVE_NEOBLOCK',
    subjectKind: 'neoblock',
    subjectId: 'NB.UNKNOWN',
    run: () => {
      const selection = clone(normalSelection);
      selection.activeNeoBlockIds = ['NB.UNKNOWN'];
      return validateSelection(dealershipSleeve, selection).diagnostics;
    },
  },
  {
    name: 'selection active NeoStack unknown',
    code: 'UNKNOWN_ACTIVE_NEOSTACK',
    subjectKind: 'neostack',
    subjectId: 'NS.UNKNOWN',
    run: () => {
      const selection = clone(normalSelection);
      selection.activeNeoStackIds = ['NS.CONTROLLER', 'NS.UNKNOWN'];
      return validateSelection(dealershipSleeve, selection).diagnostics;
    },
  },
  {
    name: 'selection disabled NeoBlock unknown',
    code: 'UNKNOWN_DISABLED_NEOBLOCK',
    subjectKind: 'neoblock',
    subjectId: 'NB.UNKNOWN',
    run: () => {
      const selection = clone(normalSelection);
      selection.disabledNeoBlockIds = ['NB.UNKNOWN'];
      return validateSelection(dealershipSleeve, selection).diagnostics;
    },
  },
  {
    name: 'selection disabled NeoStack unknown',
    code: 'UNKNOWN_DISABLED_NEOSTACK',
    subjectKind: 'neostack',
    subjectId: 'NS.UNKNOWN',
    run: () => {
      const selection = clone(normalSelection);
      selection.disabledNeoStackIds = ['NS.UNKNOWN'];
      return validateSelection(dealershipSleeve, selection).diagnostics;
    },
  },
  {
    name: 'local MOLT id unknown',
    code: 'UNKNOWN_LOCAL_MOLT_BLOCK',
    subjectKind: 'neoblock',
    subjectId: 'NB.CONTROLLER.INTAKE',
    run: () => {
      const sleeve = clone(dealershipSleeve);
      sleeve.neoBlocks[0].moltBlockIds.push('I.UNKNOWN');
      return validateSleeve(sleeve).diagnostics;
    },
  },
  {
    name: 'geometry MOLT id unknown',
    code: 'UNKNOWN_MOLT_BLOCK',
    subjectKind: 'neoblock',
    subjectId: 'NB.CONTROLLER.INTAKE',
    run: () => {
      const sleeve = clone(dealershipSleeve);
      sleeve.neoBlocks[0].baseGeometry.instruction[0].blockIds = ['I.UNKNOWN'];
      return validateSleeve(sleeve).diagnostics;
    },
  },
  {
    name: 'NeoStack references unknown NeoBlock',
    code: 'UNKNOWN_NEOBLOCK_IN_NEOSTACK',
    subjectKind: 'neostack',
    subjectId: 'NS.CONTROLLER',
    run: () => {
      const sleeve = clone(dealershipSleeve);
      sleeve.neoStacks[0].neoBlockRows[0].neoBlockIds.push('NB.UNKNOWN');
      return validateSleeve(sleeve).diagnostics;
    },
  },
  {
    name: 'scoped attachment MOLT id unknown',
    code: 'UNKNOWN_SCOPED_MOLT_BLOCK',
    subjectKind: 'scoped_attachment',
    subjectId: 'ATT.SLEEVE.PH.PRAGMATISM',
    run: () => {
      const sleeve = clone(dealershipSleeve);
      sleeve.scopedMolt[0].blockId = 'I.UNKNOWN';
      return validateSleeve(sleeve).diagnostics;
    },
  },
  {
    name: 'local MOLT block is unreachable',
    code: 'UNREACHABLE_LOCAL_MOLT_BLOCK',
    subjectKind: 'neoblock',
    subjectId: 'NB.CONTROLLER.INTAKE',
    details: { blockIds: ['I.CTRL.UNUSED'] },
    run: () => {
      const sleeve = clone(dealershipSleeve);
      sleeve.moltBlocks.push(clonedInstructionBlock(sleeve, 'I.CTRL.INTERPRET', 'I.CTRL.UNUSED'));
      sleeve.neoBlocks[0].moltBlockIds.push('I.CTRL.UNUSED');
      return validateSleeve(sleeve).diagnostics;
    },
  },
];

for (const testCase of semanticCases) runCase(testCase);

{
  const sleeve = clone(stateSleeve);
  sleeve.neoStacks.push({
    id: 'NS.ORPHAN',
    name: 'Orphan',
    skill: 'Intentionally outside the controller tree for internal resolver coverage.',
    neoBlockRows: [],
    childStackRows: [],
  });
  const selection = clone(closedSelection);
  selection.activeNeoStackIds = ['NS.ROOT', 'NS.ORPHAN'];
  selection.activeNeoBlockIds = ['NB.ROOT.ROUTE'];
  const resolution = resolveSleeve(sleeve, selection);
  assertDiagnostic(resolution.diagnostics, {
    code: 'ACTIVE_NEOSTACK_OUTSIDE_CONTROLLER_TREE',
    subjectKind: 'neostack',
    subjectId: 'NS.ORPHAN',
    details: {
      selectedNeoStackId: 'NS.ORPHAN',
      controllerNeoStackId: 'NS.ROOT',
      blockingReason: 'outside_controller_tree',
      blockingSource: 'selection',
    },
  });
}

{
  const selection = clone(closedSelection);
  selection.triggerState['T.PARENT.LEFT.DEFAULT'] = false;
  const result = compileSleeve(stateSleeve, selection);
  assertFailureEnvelope(result, 'resolution');
  assertDiagnostic(result.diagnostics, {
    code: 'NO_TRIGGER_MATCH_FOR_ACTIVE_NEOBLOCK',
    subjectKind: 'neoblock',
    subjectId: 'NB.PARENT.LEFT',
    details: {
      neoBlockId: 'NB.PARENT.LEFT',
      triggerBlockIds: ['T.PARENT.LEFT.DEFAULT'],
    },
  });
}

{
  const selection = clone(closedSelection);
  selection.activeNeoStackIds = ['NS.ROOT', 'NS.CHILD'];
  selection.activeNeoBlockIds = ['NB.CHILD.DESCENDANT'];
  const result = compileSleeve(stateSleeve, selection);
  assertFailureEnvelope(result, 'resolution');
  assertDiagnostic(result.diagnostics, {
    code: 'SELECTION_NEOBLOCK_CONTAINER_NOT_EXECUTABLE',
    subjectKind: 'neoblock',
    subjectId: 'NB.CHILD.DESCENDANT',
    details: {
      targetId: 'NB.CHILD.DESCENDANT',
      targetKind: 'neoblock',
      containerNeoStackId: 'NS.CHILD',
      blockingObjectId: 'NS.CHILD',
      blockingReason: 'missing_selected_ancestor',
      blockingSource: 'selection',
    },
  });
}

{
  const hostileSelection = new Proxy(normalSelection, {
    get(target, property, receiver) {
      if (property === 'schemaVersion') {
        throw new Error('hostile schemaVersion access');
      }
      return Reflect.get(target, property, receiver);
    },
  });

  const result = compileSleeve(dealershipSleeve, hostileSelection);
  assertFailureEnvelope(result, null);
  assert.deepEqual(result.diagnostics.map((diagnostic) => diagnostic.code), ['INTERNAL_COMPILER_ERROR']);
  assertDiagnostic(result.diagnostics, {
    code: 'INTERNAL_COMPILER_ERROR',
    subjectKind: 'compiler',
    subjectId: null,
  });
}

{
  const malformedCandidate = clone(cleanCompile);
  malformedCandidate.runtime.sleeveId = 'SLV.WRONG';
  const result = finalizeCompileResultForInternalTest(
    malformedCandidate,
    dealershipSleeve,
    normalSelection,
  );

  assertFailureEnvelope(result, null);
  assert.deepEqual(result.diagnostics.map((diagnostic) => diagnostic.code), [
    'INTERNAL_OUTPUT_CONTRACT_VIOLATION',
  ]);
  const diagnostic = assertDiagnostic(result.diagnostics, {
    code: 'INTERNAL_OUTPUT_CONTRACT_VIOLATION',
    subjectKind: 'compile_result',
    subjectId: null,
  });
  assert.ok(Array.isArray(diagnostic.details?.violations));
  assert.ok(diagnostic.details.violations.length > 0);
}

assert.deepEqual(
  [...newC2ADirectCodes].sort(),
  EXPECTED_NEW_C2A_DIRECT_CODES,
);

const registryCodes = Object.keys(DIAGNOSTIC_REGISTRY).sort();
const directUnion = new Set([
  ...HISTORICAL_C1_DIRECT_CODES,
  ...POST_C1_DIRECT_CODES,
  ...newC2ADirectCodes,
]);
const remainingCodes = registryCodes.filter((code) => !directUnion.has(code));

assert.equal(registryCodes.length, 98);
assert.equal(HISTORICAL_C1_DIRECT_CODES.length, 52);
assert.equal(POST_C1_DIRECT_CODES.length, 1);
assert.equal(newC2ADirectCodes.size, 45);
assert.equal(directUnion.size, registryCodes.length);
assert.deepEqual(remainingCodes, []);

console.log('UMG compiler-vnext diagnostic emission coverage: PASS');
