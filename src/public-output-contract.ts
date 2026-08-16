import { canonicalize } from './canonicalize.js';
import { MOLT_AUTHORITY_ORDER } from './constants.js';
import { internalOutputContractViolationDiagnostic } from './errors.js';
import {
  structurallyValidateCompileResult,
  structurallyValidateRuntimeSpec,
  structurallyValidateTrace,
} from './schema-validation.js';
import type {
  CompileResult,
  CompilerDiagnostic,
  PromptPart,
  ResolvedLane,
  ResolvedMoltBlock,
  RuntimeSpec,
  Trace,
  ValidationResult,
} from './types.js';

const MOLT_AUTHORITY_INDEX = new Map(MOLT_AUTHORITY_ORDER.map((type, index) => [type, index]));

function sameValue(left: unknown, right: unknown): boolean {
  return canonicalize(left) === canonicalize(right);
}

function prefixedPath(prefix: string, path: string | undefined): string {
  if (!path) return prefix;
  return /^\[\d+\]/.test(path) ? `${prefix}${path}` : `${prefix}.${path}`;
}

function pushViolation(
  diagnostics: CompilerDiagnostic[],
  message: string,
  path?: string,
  details?: Record<string, unknown>,
): void {
  diagnostics.push(internalOutputContractViolationDiagnostic({ ...details, message, path }));
}

function pushPrefixedDiagnostics(
  target: CompilerDiagnostic[],
  diagnostics: CompilerDiagnostic[],
  prefix: string,
): void {
  diagnostics.forEach((diagnostic) => {
    target.push({
      ...diagnostic,
      path: prefixedPath(prefix, diagnostic.path),
    });
  });
}

function validateProvenance(
  block: ResolvedMoltBlock,
  path: string,
  diagnostics: CompilerDiagnostic[],
): void {
  switch (block.sourceMode) {
    case 'local':
      if (block.sourceId !== block.id) {
        pushViolation(diagnostics, 'Local provenance must use the block id as sourceId.', `${path}.sourceId`);
      }
      if (block.sourceScope !== undefined) {
        pushViolation(diagnostics, 'Local provenance cannot include sourceScope.', `${path}.sourceScope`);
      }
      if (block.overlayId !== undefined) {
        pushViolation(diagnostics, 'Local provenance cannot include overlayId.', `${path}.overlayId`);
      }
      if (block.mergeId !== undefined) {
        pushViolation(diagnostics, 'Local provenance cannot include mergeId.', `${path}.mergeId`);
      }
      break;

    case 'scoped':
      if (block.sourceScope === undefined) {
        pushViolation(diagnostics, 'Scoped provenance requires sourceScope.', `${path}.sourceScope`);
      }
      if (block.overlayId !== undefined) {
        pushViolation(diagnostics, 'Scoped provenance cannot include overlayId.', `${path}.overlayId`);
      }
      if (block.mergeId !== undefined) {
        pushViolation(diagnostics, 'Scoped provenance cannot include mergeId.', `${path}.mergeId`);
      }
      break;

    case 'overlay':
      if (block.sourceScope === undefined) {
        pushViolation(diagnostics, 'Overlay provenance requires sourceScope.', `${path}.sourceScope`);
      }
      if (block.overlayId === undefined) {
        pushViolation(diagnostics, 'Overlay provenance requires overlayId.', `${path}.overlayId`);
      }
      if (block.mergeId !== undefined) {
        pushViolation(diagnostics, 'Overlay provenance cannot include mergeId.', `${path}.mergeId`);
      }
      break;

    case 'merge':
      if (block.mergeId === undefined) {
        pushViolation(diagnostics, 'Merge provenance requires mergeId.', `${path}.mergeId`);
      }
      if (block.sourceId !== block.mergeId) {
        pushViolation(diagnostics, 'Merge provenance must use the merge id as sourceId.', `${path}.sourceId`);
      }
      if (block.sourceScope !== undefined) {
        pushViolation(diagnostics, 'Merge provenance cannot include sourceScope.', `${path}.sourceScope`);
      }
      if (block.overlayId !== undefined) {
        pushViolation(diagnostics, 'Merge provenance cannot include overlayId.', `${path}.overlayId`);
      }
      break;
  }
}

function validateLane(lane: ResolvedLane, path: string, diagnostics: CompilerDiagnostic[]): void {
  if (lane.geometrySource === 'bundle') {
    if (!lane.bundleId) {
      pushViolation(diagnostics, 'Bundle geometry requires bundleId.', `${path}.bundleId`);
    }
  } else if (lane.bundleId !== undefined) {
    pushViolation(diagnostics, 'Non-bundle geometry cannot include bundleId.', `${path}.bundleId`);
  }

  if (lane.moltType === 'trigger' && lane.geometrySource !== 'evaluated-trigger-lane') {
    pushViolation(
      diagnostics,
      'Trigger lanes must use evaluated-trigger-lane geometrySource.',
      `${path}.geometrySource`,
    );
  }
  if (lane.moltType === 'directive' && lane.geometrySource !== 'generated-directive-lane') {
    pushViolation(
      diagnostics,
      'Directive lanes must use generated-directive-lane geometrySource.',
      `${path}.geometrySource`,
    );
  }
  if (
    lane.moltType !== 'trigger' &&
    lane.moltType !== 'directive' &&
    (lane.geometrySource === 'evaluated-trigger-lane' || lane.geometrySource === 'generated-directive-lane')
  ) {
    pushViolation(
      diagnostics,
      'Only trigger/directive lanes may use generated geometry sources.',
      `${path}.geometrySource`,
    );
  }

  let previousRow = 0;
  lane.rows.forEach((row, rowIndex) => {
    if (row.row <= previousRow) {
      pushViolation(diagnostics, 'Resolved lane rows must be strictly ascending.', `${path}.rows[${rowIndex}].row`);
    }
    previousRow = row.row;
    row.blocks.forEach((block, blockIndex) =>
      validateProvenance(block, `${path}.rows[${rowIndex}].blocks[${blockIndex}]`, diagnostics),
    );
  });
  lane.scoped.forEach((block, index) =>
    validateProvenance(block, `${path}.scoped[${index}]`, diagnostics),
  );
}

function expectedPromptParts(runtime: RuntimeSpec, diagnostics: CompilerDiagnostic[]): PromptPart[] {
  const activeStackIds = new Set(runtime.activeNeoStackIds);
  const neoStackByNeoBlockId = new Map<string, string>();

  runtime.promptParts.forEach((part, index) => {
    if (!activeStackIds.has(part.neoStackId)) {
      pushViolation(
        diagnostics,
        'PromptPart neoStackId must refer to an active NeoStack.',
        `promptParts[${index}].neoStackId`,
      );
    }

    const existing = neoStackByNeoBlockId.get(part.neoBlockId);
    if (existing && existing !== part.neoStackId) {
      pushViolation(
        diagnostics,
        'PromptParts for the same NeoBlock must share one neoStackId.',
        `promptParts[${index}].neoStackId`,
      );
    } else if (!existing) {
      neoStackByNeoBlockId.set(part.neoBlockId, part.neoStackId);
    }
  });

  const result: PromptPart[] = [];
  runtime.resolvedNeoBlocks.forEach((neoBlock, blockIndex) => {
    const neoStackId = neoStackByNeoBlockId.get(neoBlock.id);
    const expectedCount = neoBlock.lanes.reduce(
      (count, lane) => count + lane.scoped.length + lane.rows.reduce((rowCount, row) => rowCount + row.blocks.length, 0),
      0,
    );
    if (!neoStackId) {
      if (expectedCount > 0) {
        pushViolation(
          diagnostics,
          'Resolved NeoBlock contributions must appear in promptParts.',
          `resolvedNeoBlocks[${blockIndex}]`,
          { neoBlockId: neoBlock.id },
        );
      }
      return;
    }

    neoBlock.lanes.forEach((lane) => {
      const laneOrder = (MOLT_AUTHORITY_INDEX.get(lane.moltType) ?? -1) + 1;
      lane.scoped.forEach((block, index) => {
        result.push({
          ...block,
          neoStackId,
          neoBlockId: neoBlock.id,
          laneOrder,
          scopeLayer: block.sourceScope?.kind === 'sleeve' ? 0 : 1,
          row: 0,
          column: index + 1,
        });
      });
      lane.rows.forEach((row) => {
        row.blocks.forEach((block, index) => {
          result.push({
            ...block,
            neoStackId,
            neoBlockId: neoBlock.id,
            laneOrder,
            scopeLayer: 100,
            row: row.row,
            column: index + 1,
          });
        });
      });
    });
  });

  return result;
}

export function validateTraceContract(input: unknown): ValidationResult {
  const structural = structurallyValidateTrace(input);
  if (!structural.ok) return { diagnostics: structural.diagnostics };
  const trace: Trace = structural.value;
  const diagnostics: CompilerDiagnostic[] = [];

  let previousSeq = 0;
  trace.events.forEach((event, index) => {
    if (event.seq <= previousSeq) {
      pushViolation(
        diagnostics,
        'Trace events must use a strictly increasing seq order.',
        `events[${index}].seq`,
      );
    }
    previousSeq = event.seq;
  });

  return { diagnostics };
}

export function validateRuntimeSpecContract(input: unknown): ValidationResult {
  const structural = structurallyValidateRuntimeSpec(input);
  if (!structural.ok) return { diagnostics: structural.diagnostics };
  const runtime: RuntimeSpec = structural.value;
  const diagnostics: CompilerDiagnostic[] = [];

  if (runtime.diagnostics.some((diagnostic) => diagnostic.level === 'error')) {
    pushViolation(
      diagnostics,
      'RuntimeSpec diagnostics must not contain error diagnostics.',
      'diagnostics',
    );
  }

  if (!sameValue(runtime.resetPlan.neoStackIds, runtime.activeNeoStackIds)) {
    pushViolation(
      diagnostics,
      'ResetPlan neoStackIds must equal activeNeoStackIds.',
      'resetPlan.neoStackIds',
    );
  }

  if (!sameValue(runtime.resetPlan.neoBlockIds, runtime.resolvedNeoBlocks.map((neoBlock) => neoBlock.id))) {
    pushViolation(
      diagnostics,
      'ResetPlan neoBlockIds must equal resolvedNeoBlocks ids in resolved order.',
      'resetPlan.neoBlockIds',
    );
  }

  runtime.resolvedNeoBlocks.forEach((neoBlock, blockIndex) => {
    let previousAuthorityIndex = -1;
    const seenLaneTypes = new Set<string>();

    neoBlock.lanes.forEach((lane, laneIndex) => {
      const authorityIndex = MOLT_AUTHORITY_INDEX.get(lane.moltType);
      if (authorityIndex === undefined) {
        pushViolation(
          diagnostics,
          'Resolved lane must use a canonical MOLT authority lane.',
          `resolvedNeoBlocks[${blockIndex}].lanes[${laneIndex}].moltType`,
        );
      } else {
        if (authorityIndex <= previousAuthorityIndex) {
          pushViolation(
            diagnostics,
            'Resolved lanes must remain in canonical MOLT authority order.',
            `resolvedNeoBlocks[${blockIndex}].lanes[${laneIndex}].moltType`,
          );
        }
        previousAuthorityIndex = authorityIndex;
      }

      if (seenLaneTypes.has(lane.moltType)) {
        pushViolation(
          diagnostics,
          'Resolved lanes must not repeat a MOLT authority lane.',
          `resolvedNeoBlocks[${blockIndex}].lanes[${laneIndex}].moltType`,
        );
      }
      seenLaneTypes.add(lane.moltType);

      validateLane(lane, `resolvedNeoBlocks[${blockIndex}].lanes[${laneIndex}]`, diagnostics);
    });
  });

  runtime.promptParts.forEach((part, index) =>
    validateProvenance(part, `promptParts[${index}]`, diagnostics),
  );

  const expected = expectedPromptParts(runtime, diagnostics);
  if (!sameValue(runtime.promptParts, expected)) {
    pushViolation(
      diagnostics,
      'PromptParts must be the deterministic flattened sequence of resolved cognition.',
      'promptParts',
      {
        expectedCount: expected.length,
        actualCount: runtime.promptParts.length,
      },
    );
  }

  return { diagnostics };
}

export function validateCompileResultContract(input: unknown): ValidationResult {
  const structural = structurallyValidateCompileResult(input);
  if (!structural.ok) return { diagnostics: structural.diagnostics };
  const result: CompileResult = structural.value;
  const diagnostics: CompilerDiagnostic[] = [];

  if (result.trace) {
    pushPrefixedDiagnostics(diagnostics, validateTraceContract(result.trace).diagnostics, 'trace');
    if (!sameValue(result.trace.diagnostics, result.diagnostics)) {
      pushViolation(
        diagnostics,
        'Trace diagnostics must equal CompileResult diagnostics.',
        'trace.diagnostics',
      );
    }
    if (result.trace.compilerVersion !== result.compilerVersion) {
      pushViolation(
        diagnostics,
        'Trace compilerVersion must equal CompileResult compilerVersion.',
        'trace.compilerVersion',
      );
    }
  }

  if (result.runtime) {
    pushPrefixedDiagnostics(diagnostics, validateRuntimeSpecContract(result.runtime).diagnostics, 'runtime');
    if (!sameValue(result.runtime.diagnostics, result.diagnostics)) {
      pushViolation(
        diagnostics,
        'RuntimeSpec diagnostics must equal CompileResult diagnostics.',
        'runtime.diagnostics',
      );
    }
    if (result.runtime.compilerVersion !== result.compilerVersion) {
      pushViolation(
        diagnostics,
        'RuntimeSpec compilerVersion must equal CompileResult compilerVersion.',
        'runtime.compilerVersion',
      );
    }
  }

  if (result.runtime && result.trace) {
    if (result.runtime.sleeveId !== result.trace.sleeveId) {
      pushViolation(
        diagnostics,
        'RuntimeSpec sleeveId must equal Trace sleeveId.',
        'runtime.sleeveId',
      );
    }
    if (result.runtime.compiledAt !== result.trace.compiledAt) {
      pushViolation(
        diagnostics,
        'RuntimeSpec compiledAt must equal Trace compiledAt.',
        'runtime.compiledAt',
      );
    }
  }

  const hasErrorDiagnostics = result.diagnostics.some((diagnostic) => diagnostic.level === 'error');
  if (result.status === 'success') {
    if (result.hasErrors !== false) {
      pushViolation(diagnostics, 'Successful CompileResult must set hasErrors=false.', 'hasErrors');
    }
    if (result.runtime === null) {
      pushViolation(diagnostics, 'Successful CompileResult must include RuntimeSpec.', 'runtime');
    }
    if (result.trace === null) {
      pushViolation(diagnostics, 'Successful CompileResult must include Trace.', 'trace');
    }
    if (hasErrorDiagnostics) {
      pushViolation(
        diagnostics,
        'Successful CompileResult must not contain error diagnostics.',
        'diagnostics',
      );
    }
  } else {
    if (result.hasErrors !== true) {
      pushViolation(diagnostics, 'Failed CompileResult must set hasErrors=true.', 'hasErrors');
    }
    if (result.runtime !== null) {
      pushViolation(diagnostics, 'Failed CompileResult must not expose RuntimeSpec.', 'runtime');
    }
    if (!hasErrorDiagnostics) {
      pushViolation(
        diagnostics,
        'Failed CompileResult must contain at least one error diagnostic.',
        'diagnostics',
      );
    }
  }

  return { diagnostics };
}
