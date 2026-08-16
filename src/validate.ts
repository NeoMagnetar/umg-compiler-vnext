import { MERGE_AUTHORITY_ORDER, SCOPED_MOLT_TYPES } from './constants.js';
import { errorDiagnostic, internalCompilerErrorDiagnostic, warningDiagnostic } from './errors.js';
import { structurallyValidateSelection, structurallyValidateSleeve } from './schema-validation.js';
import type {
  BundleMoltType,
  CompilerDiagnostic,
  CompileSelection,
  GeometryRow,
  MoltBlock,
  MoltBundle,
  MoltType,
  NeoBlock,
  NeoStack,
  ScopeRef,
  Sleeve,
  ValidationResult,
} from './types.js';

interface Indexes {
  moltBlocks: Map<string, MoltBlock>;
  neoBlocks: Map<string, NeoBlock>;
  neoStacks: Map<string, NeoStack>;
  parentByStackId: Map<string, string>;
  stackByNeoBlockId: Map<string, string>;
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) dupes.add(value);
    seen.add(value);
  }
  return [...dupes].sort();
}

type ModuleRow = { row: number; neoBlockIds?: string[]; neoStackIds?: string[] };

function moduleRowMemberIds(row: ModuleRow): string[] {
  return row.neoBlockIds ?? row.neoStackIds ?? [];
}

function validateRows(
  rows: GeometryRow[] | undefined,
  path: string,
  diagnostics: CompilerDiagnostic[],
): void {
  if (!rows || rows.length === 0) {
    diagnostics.push(errorDiagnostic('EMPTY_GEOMETRY', 'Geometry requires at least one row.', path));
    return;
  }

  const rowNumbers = rows.map((row) => row.row);
  const rowDupes = duplicates(rowNumbers.map(String));
  if (rowDupes.length) {
    diagnostics.push(
      errorDiagnostic('DUPLICATE_GEOMETRY_ROW', 'Geometry row numbers must be unique.', path, {
        duplicateRows: rowDupes,
      }),
    );
  }

  const sorted = [...new Set(rowNumbers)].sort((a, b) => a - b);
  const expected = Array.from({ length: sorted.length }, (_, index) => index + 1);
  if (JSON.stringify(sorted) !== JSON.stringify(expected)) {
    diagnostics.push(
      errorDiagnostic(
        'NONCONTIGUOUS_GEOMETRY_ROWS',
        'Geometry rows must be one-based and contiguous: 1, 2, 3, ...',
        path,
        { actualRows: sorted, expectedRows: expected },
      ),
    );
  }

  const allBlockIds: string[] = [];
  rows.forEach((row, index) => {
    if (!Number.isInteger(row.row) || row.row < 1) {
      diagnostics.push(
        errorDiagnostic('INVALID_GEOMETRY_ROW', 'Geometry row must be a positive integer.', `${path}[${index}].row`),
      );
    }
    if (!Array.isArray(row.blockIds) || row.blockIds.length === 0) {
      diagnostics.push(
        errorDiagnostic('EMPTY_GEOMETRY_ROW', 'Every geometry row requires at least one block.', `${path}[${index}]`),
      );
    }
    allBlockIds.push(...row.blockIds);
  });

  const blockDupes = duplicates(allBlockIds);
  if (blockDupes.length) {
    diagnostics.push(
      errorDiagnostic(
        'DUPLICATE_GEOMETRY_MEMBER',
        'A block may appear only once in one lane geometry.',
        path,
        { duplicateBlockIds: blockDupes },
      ),
    );
  }
}

function validateModuleRows(rows: ModuleRow[], path: string, diagnostics: CompilerDiagnostic[]): void {
  if (!rows.length) return;

  const rowNumbers = rows.map((row) => row.row);
  const duplicateRows = duplicates(rowNumbers.map(String));
  if (duplicateRows.length) {
    diagnostics.push(
      errorDiagnostic(
        'DUPLICATE_MODULE_ROW',
        'NeoBlock/NeoStack row numbers must be unique within one parent geometry.',
        path,
        { duplicateRows },
      ),
    );
  }

  const sorted = [...new Set(rowNumbers)].sort((a, b) => a - b);
  const expected = Array.from({ length: sorted.length }, (_, index) => index + 1);
  if (JSON.stringify(sorted) !== JSON.stringify(expected)) {
    diagnostics.push(
      errorDiagnostic(
        'NONCONTIGUOUS_MODULE_ROWS',
        'NeoBlock/NeoStack rows must be one-based and contiguous.',
        path,
        { actualRows: sorted, expectedRows: expected },
      ),
    );
  }

  const allIds: string[] = [];
  rows.forEach((row, index) => {
    if (!Number.isInteger(row.row) || row.row < 1) {
      diagnostics.push(
        errorDiagnostic(
          'INVALID_MODULE_ROW',
          'NeoBlock/NeoStack row must be a positive integer.',
          `${path}[${index}].row`,
        ),
      );
    }

    const ids = moduleRowMemberIds(row);
    if (!Array.isArray(ids) || ids.length === 0) {
      diagnostics.push(
        errorDiagnostic(
          'EMPTY_MODULE_ROW',
          'Every NeoBlock/NeoStack row requires at least one member.',
          `${path}[${index}]`,
        ),
      );
      return;
    }

    allIds.push(...ids);
  });

  const duplicateMembers = duplicates(allIds);
  if (duplicateMembers.length) {
    diagnostics.push(
      errorDiagnostic('DUPLICATE_MODULE_ROW_MEMBER', 'A module may appear only once per parent geometry.', path, {
        duplicateIds: duplicateMembers,
      }),
    );
  }
}

function buildIndexes(sleeve: Sleeve, diagnostics: CompilerDiagnostic[]): Indexes {
  const allIds = [
    ...sleeve.moltBlocks.map((item) => item.id),
    ...sleeve.neoBlocks.map((item) => item.id),
    ...sleeve.neoStacks.map((item) => item.id),
    ...(sleeve.scopedMolt ?? []).map((item) => item.id),
    ...(sleeve.overlays ?? []).flatMap((overlay) => [overlay.id, ...overlay.attachments.map((item) => item.id)]),
    ...(sleeve.governance ?? []).map((item) => item.id),
  ];
  const duplicateGlobalIds = duplicates(allIds);
  if (duplicateGlobalIds.length) {
    diagnostics.push(
      errorDiagnostic('DUPLICATE_GLOBAL_ID', 'All canonical object IDs must be globally unique.', 'sleeve', {
        duplicateIds: duplicateGlobalIds,
      }),
    );
  }

  const moltBlocks = new Map(sleeve.moltBlocks.map((item) => [item.id, item]));
  const neoBlocks = new Map(sleeve.neoBlocks.map((item) => [item.id, item]));
  const neoStacks = new Map(sleeve.neoStacks.map((item) => [item.id, item]));
  const parentByStackId = new Map<string, string>();
  const stackByNeoBlockId = new Map<string, string>();

  for (const stack of sleeve.neoStacks) {
    for (const row of stack.childStackRows ?? []) {
      for (const childId of row.neoStackIds) {
        if (!neoStacks.has(childId)) {
          diagnostics.push(
            errorDiagnostic(
              'UNKNOWN_CHILD_NEOSTACK',
              `NeoStack ${stack.id} references unknown child ${childId}.`,
              `neoStacks.${stack.id}.childStackRows`,
            ),
          );
          continue;
        }
        const existingParent = parentByStackId.get(childId);
        if (existingParent && existingParent !== stack.id) {
          diagnostics.push(
            errorDiagnostic(
              'MULTIPLE_NEOSTACK_PARENTS',
              `NeoStack ${childId} has more than one parent.`,
              `neoStacks.${stack.id}.childStackRows`,
              { parents: [existingParent, stack.id] },
            ),
          );
        } else {
          parentByStackId.set(childId, stack.id);
        }
      }
    }

    for (const row of stack.neoBlockRows) {
      for (const neoBlockId of row.neoBlockIds) {
        if (!neoBlocks.has(neoBlockId)) {
          diagnostics.push(
            errorDiagnostic(
              'UNKNOWN_NEOBLOCK_IN_NEOSTACK',
              `NeoStack ${stack.id} references unknown NeoBlock ${neoBlockId}.`,
              `neoStacks.${stack.id}.neoBlockRows`,
            ),
          );
          continue;
        }
        const existingStack = stackByNeoBlockId.get(neoBlockId);
        if (existingStack && existingStack !== stack.id) {
          diagnostics.push(
            errorDiagnostic(
              'NEOBLOCK_IN_MULTIPLE_NEOSTACKS',
              `NeoBlock ${neoBlockId} belongs to more than one NeoStack in vNext.`,
              `neoStacks.${stack.id}.neoBlockRows`,
              { neoStacks: [existingStack, stack.id] },
            ),
          );
        } else {
          stackByNeoBlockId.set(neoBlockId, stack.id);
        }
      }
    }
  }

  return { moltBlocks, neoBlocks, neoStacks, parentByStackId, stackByNeoBlockId };
}

function validateNoStackCycles(indexes: Indexes, diagnostics: CompilerDiagnostic[]): void {
  for (const stackId of indexes.neoStacks.keys()) {
    const visited = new Set<string>();
    let current: string | undefined = stackId;
    while (current) {
      if (visited.has(current)) {
        diagnostics.push(
          errorDiagnostic('NEOSTACK_CYCLE', `NeoStack cycle detected from ${stackId}.`, `neoStacks.${stackId}`),
        );
        break;
      }
      visited.add(current);
      current = indexes.parentByStackId.get(current);
    }
  }
}

function reachableStacksFromController(controllerNeoStackId: string, indexes: Indexes): Set<string> {
  const reachable = new Set<string>();

  const visit = (stackId: string): void => {
    if (reachable.has(stackId)) return;
    reachable.add(stackId);
    for (const childId of indexes.parentByStackId.keys()) {
      if (indexes.parentByStackId.get(childId) === stackId) visit(childId);
    }
  };

  if (indexes.neoStacks.has(controllerNeoStackId)) visit(controllerNeoStackId);
  return reachable;
}

function validateGeometryMembers(
  neoBlock: NeoBlock,
  moltType: MoltType,
  rows: GeometryRow[],
  indexes: Indexes,
  diagnostics: CompilerDiagnostic[],
  path: string,
): void {
  const localIds = new Set(neoBlock.moltBlockIds);
  for (const row of rows) {
    for (const blockId of row.blockIds) {
      const block = indexes.moltBlocks.get(blockId);
      if (!block) {
        diagnostics.push(errorDiagnostic('UNKNOWN_MOLT_BLOCK', `Unknown MOLT Block ${blockId}.`, path));
        continue;
      }
      if (!localIds.has(blockId)) {
        diagnostics.push(
          errorDiagnostic(
            'NONLOCAL_GEOMETRY_MEMBER',
            `MOLT Block ${blockId} is not local to NeoBlock ${neoBlock.id}.`,
            path,
          ),
        );
      }
      if (block.type !== moltType) {
        diagnostics.push(
          errorDiagnostic(
            'LANE_MEMBER_TYPE_MISMATCH',
            `MOLT Block ${blockId} is ${block.type}, but the lane is ${moltType}.`,
            path,
            { blockId, actualType: block.type, expectedType: moltType },
          ),
        );
      }
    }
  }
}

function validateBundle(
  neoBlock: NeoBlock,
  bundle: MoltBundle,
  indexes: Indexes,
  diagnostics: CompilerDiagnostic[],
): void {
  const path = `neoBlocks.${neoBlock.id}.bundles.${bundle.id}`;
  validateRows(bundle.rows, `${path}.rows`, diagnostics);
  validateGeometryMembers(neoBlock, bundle.moltType, bundle.rows, indexes, diagnostics, path);
}

function validateNeoBlock(neoBlock: NeoBlock, indexes: Indexes, diagnostics: CompilerDiagnostic[]): void {
  const path = `neoBlocks.${neoBlock.id}`;
  const localIds = new Set(neoBlock.moltBlockIds);

  const duplicateLocalIds = duplicates(neoBlock.moltBlockIds);
  if (duplicateLocalIds.length) {
    diagnostics.push(
      errorDiagnostic('DUPLICATE_LOCAL_MOLT_ID', 'NeoBlock local MOLT IDs must be unique.', `${path}.moltBlockIds`, {
        duplicateIds: duplicateLocalIds,
      }),
    );
  }

  const localBlocks: MoltBlock[] = [];
  for (const id of neoBlock.moltBlockIds) {
    const block = indexes.moltBlocks.get(id);
    if (!block) {
      diagnostics.push(errorDiagnostic('UNKNOWN_LOCAL_MOLT_BLOCK', `Unknown local MOLT Block ${id}.`, path));
    } else {
      localBlocks.push(block);
    }
  }

  const countByType = new Map<MoltType, number>();
  for (const block of localBlocks) countByType.set(block.type, (countByType.get(block.type) ?? 0) + 1);

  const required: MoltType[] = ['trigger', 'directive', 'instruction', 'subject', 'primary'];
  for (const type of required) {
    if ((countByType.get(type) ?? 0) < 1) {
      diagnostics.push(
        errorDiagnostic(
          'REQUIRED_MOLT_MISSING',
          `NeoBlock ${neoBlock.id} requires at least one ${type} MOLT Block.`,
          path,
          { moltType: type },
        ),
      );
    }
  }

  const prime = indexes.moltBlocks.get(neoBlock.primeDirectiveId);
  if (!prime || !localIds.has(neoBlock.primeDirectiveId) || prime.type !== 'directive') {
    diagnostics.push(
      errorDiagnostic(
        'INVALID_PRIME_DIRECTIVE',
        `NeoBlock ${neoBlock.id} must reference one local Directive as primeDirectiveId.`,
        `${path}.primeDirectiveId`,
      ),
    );
  }

  for (const [moltType, rows] of Object.entries(neoBlock.baseGeometry) as [MoltType, GeometryRow[]][]) {
    validateRows(rows, `${path}.baseGeometry.${moltType}`, diagnostics);
    validateGeometryMembers(neoBlock, moltType, rows, indexes, diagnostics, `${path}.baseGeometry.${moltType}`);
  }

  for (const requiredType of required) {
    const rows = neoBlock.baseGeometry[requiredType];
    if (!rows?.length) {
      diagnostics.push(
        errorDiagnostic(
          'REQUIRED_BASE_LANE_MISSING',
          `NeoBlock ${neoBlock.id} requires Base Geometry for ${requiredType}.`,
          `${path}.baseGeometry.${requiredType}`,
        ),
      );
    }
  }

  const directiveRows = neoBlock.baseGeometry.directive ?? [];
  if (
    directiveRows.length > 0 &&
    (directiveRows.length !== 1 ||
      directiveRows[0]?.row !== 1 ||
      directiveRows[0]?.blockIds.length !== 1 ||
      directiveRows[0]?.blockIds[0] !== neoBlock.primeDirectiveId)
  ) {
    diagnostics.push(
      errorDiagnostic(
        'DIRECTIVE_BASE_GEOMETRY_CANON_VIOLATION',
        'baseGeometry.directive must contain exactly one row with only the Prime Directive. Secondary Directives must be declared in secondaryDirectives.',
        `${path}.baseGeometry.directive`,
        {
          primeDirectiveId: neoBlock.primeDirectiveId,
          authoredRows: directiveRows.map((row) => ({ row: row.row, blockIds: [...row.blockIds] })),
        },
      ),
    );
  }

  const bundleMap = new Map((neoBlock.bundles ?? []).map((bundle) => [bundle.id, bundle]));
  const bundleDupes = duplicates((neoBlock.bundles ?? []).map((bundle) => bundle.id));
  if (bundleDupes.length) {
    diagnostics.push(
      errorDiagnostic('DUPLICATE_BUNDLE_ID', 'Bundle IDs must be unique inside the NeoBlock.', `${path}.bundles`, {
        duplicateIds: bundleDupes,
      }),
    );
  }
  for (const bundle of neoBlock.bundles ?? []) validateBundle(neoBlock, bundle, indexes, diagnostics);

  const secondaryIds = (neoBlock.secondaryDirectives ?? []).map((secondary) => secondary.id);
  const secondaryDupes = duplicates(secondaryIds);
  if (secondaryDupes.length) {
    diagnostics.push(
      errorDiagnostic(
        'DUPLICATE_SECONDARY_DIRECTIVE_ID',
        'Secondary Directive relation IDs must be unique.',
        `${path}.secondaryDirectives`,
        { duplicateIds: secondaryDupes },
      ),
    );
  }

  const triggerBindings: string[] = [];
  for (const secondary of neoBlock.secondaryDirectives ?? []) {
    const secondaryPath = `${path}.secondaryDirectives.${secondary.id}`;
    const directiveBlock = indexes.moltBlocks.get(secondary.directiveBlockId);
    const triggerBlock = indexes.moltBlocks.get(secondary.triggerBlockId);

    if (!directiveBlock || !localIds.has(secondary.directiveBlockId) || directiveBlock.type !== 'directive') {
      diagnostics.push(
        errorDiagnostic(
          'INVALID_SECONDARY_DIRECTIVE_BLOCK',
          `Secondary Directive ${secondary.id} must reference a local Directive block.`,
          `${secondaryPath}.directiveBlockId`,
        ),
      );
    }
    if (secondary.directiveBlockId === neoBlock.primeDirectiveId) {
      diagnostics.push(
        errorDiagnostic(
          'PRIME_AS_SECONDARY_DIRECTIVE',
          'Prime Directive cannot also be declared as a Secondary Directive.',
          `${secondaryPath}.directiveBlockId`,
        ),
      );
    }
    if (!triggerBlock || !localIds.has(secondary.triggerBlockId) || triggerBlock.type !== 'trigger') {
      diagnostics.push(
        errorDiagnostic(
          'INVALID_SECONDARY_TRIGGER_BLOCK',
          `Secondary Directive ${secondary.id} must reference a local Trigger block.`,
          `${secondaryPath}.triggerBlockId`,
        ),
      );
    }
    triggerBindings.push(secondary.triggerBlockId);

    for (const [moltType, bundleId] of Object.entries(secondary.bundles ?? {}) as [BundleMoltType, string][]) {
      const bundle = bundleMap.get(bundleId);
      if (!bundle) {
        diagnostics.push(
          errorDiagnostic('UNKNOWN_BUNDLE_REFERENCE', `Unknown Bundle ${bundleId}.`, `${secondaryPath}.bundles.${moltType}`),
        );
        continue;
      }
      if (bundle.moltType !== moltType) {
        diagnostics.push(
          errorDiagnostic(
            'BUNDLE_REFERENCE_TYPE_MISMATCH',
            `Bundle ${bundleId} is ${bundle.moltType}, not ${moltType}.`,
            `${secondaryPath}.bundles.${moltType}`,
          ),
        );
      }
    }
  }

  const duplicateTriggerBindings = duplicates(triggerBindings);
  if (duplicateTriggerBindings.length) {
    diagnostics.push(
      errorDiagnostic(
        'TRIGGER_BOUND_TO_MULTIPLE_SECONDARIES',
        'One Trigger cannot select multiple Secondary Directives in vNext.',
        `${path}.secondaryDirectives`,
        { triggerBlockIds: duplicateTriggerBindings },
      ),
    );
  }

  const secondaryDirectiveIds = new Set((neoBlock.secondaryDirectives ?? []).map((secondary) => secondary.directiveBlockId));
  const mergeDirectiveIds = new Set<string>();
  for (const merge of neoBlock.merges ?? []) {
    for (const sourceId of merge.sourceBlockIds) {
      const source = indexes.moltBlocks.get(sourceId);
      if (source?.type === 'directive' && localIds.has(sourceId)) mergeDirectiveIds.add(sourceId);
    }
    const result = indexes.moltBlocks.get(merge.resultBlockId);
    if (result?.type === 'directive' && localIds.has(merge.resultBlockId)) mergeDirectiveIds.add(merge.resultBlockId);
  }

  const orphanLocalDirectives = localBlocks
    .filter(
      (block) =>
        block.type === 'directive' &&
        block.id !== neoBlock.primeDirectiveId &&
        !secondaryDirectiveIds.has(block.id) &&
        !mergeDirectiveIds.has(block.id),
    )
    .map((block) => block.id)
    .sort();
  if (orphanLocalDirectives.length) {
    diagnostics.push(
      errorDiagnostic(
        'ORPHAN_LOCAL_DIRECTIVE',
        'Every non-Prime local Directive must participate in a Secondary Directive relation or a Merge declaration.',
        `${path}.moltBlockIds`,
        { directiveBlockIds: orphanLocalDirectives },
      ),
    );
  }

  const mergeIds = (neoBlock.merges ?? []).map((merge) => merge.id);
  const mergeDupes = duplicates(mergeIds);
  if (mergeDupes.length) {
    diagnostics.push(
      errorDiagnostic('DUPLICATE_MERGE_ID', 'Merge IDs must be unique inside the NeoBlock.', `${path}.merges`, {
        duplicateIds: mergeDupes,
      }),
    );
  }

  for (const merge of neoBlock.merges ?? []) {
    const mergePath = `${path}.merges.${merge.id}`;
    const sourceDupes = duplicates(merge.sourceBlockIds);
    if (merge.sourceBlockIds.length < 2) {
      diagnostics.push(
        errorDiagnostic('MERGE_TOO_FEW_SOURCES', 'Merge requires at least two unique source blocks.', mergePath),
      );
    }
    if (sourceDupes.length) {
      diagnostics.push(
        errorDiagnostic('MERGE_DUPLICATE_SOURCE', 'Merge source IDs must be unique.', mergePath, {
          duplicateIds: sourceDupes,
        }),
      );
    }

    const result = indexes.moltBlocks.get(merge.resultBlockId);
    if (!result || !localIds.has(merge.resultBlockId)) {
      diagnostics.push(
        errorDiagnostic(
          'INVALID_MERGE_RESULT',
          `Merge ${merge.id} must reference a pre-authored local result MOLT Block.`,
          `${mergePath}.resultBlockId`,
        ),
      );
      continue;
    }
    if (result.type === 'trigger') {
      diagnostics.push(
        errorDiagnostic('TRIGGER_MERGE_UNSUPPORTED', 'Trigger is outside vNext Merge semantics.', mergePath),
      );
    }

    const sources: MoltBlock[] = [];
    for (const sourceId of merge.sourceBlockIds) {
      const source = indexes.moltBlocks.get(sourceId);
      if (!source || !localIds.has(sourceId)) {
        diagnostics.push(
          errorDiagnostic(
            'INVALID_MERGE_SOURCE',
            `Merge source ${sourceId} must be a local MOLT Block in vNext.`,
            `${mergePath}.sourceBlockIds`,
          ),
        );
      } else {
        sources.push(source);
      }
    }
    if (sources.some((source) => source.type === 'trigger')) {
      diagnostics.push(
        errorDiagnostic('TRIGGER_MERGE_UNSUPPORTED', 'Trigger is outside vNext Merge semantics.', mergePath),
      );
    }

    const authorityIndex = new Map<string, number>(MERGE_AUTHORITY_ORDER.map((type, index) => [type, index]));
    const sourceIndexes = sources
      .map((source) => authorityIndex.get(source.type))
      .filter((value): value is number => value !== undefined);
    const resultIndex = authorityIndex.get(result.type);
    if (sourceIndexes.length && resultIndex !== undefined) {
      const ceiling = Math.min(...sourceIndexes);
      if (resultIndex < ceiling) {
        diagnostics.push(
          errorDiagnostic(
            'MERGE_AUTHORITY_ESCALATION',
            `Merge ${merge.id} attempts to create higher MOLT authority than its sources permit.`,
            mergePath,
            {
              sourceTypes: sources.map((source) => source.type),
              resultType: result.type,
              highestAuthorizedType: MERGE_AUTHORITY_ORDER[ceiling],
            },
          ),
        );
      }
    }
  }

  const reachable = new Set<string>();
  for (const rows of Object.values(neoBlock.baseGeometry)) for (const row of rows ?? []) row.blockIds.forEach((id) => reachable.add(id));
  for (const bundle of neoBlock.bundles ?? []) for (const row of bundle.rows) row.blockIds.forEach((id) => reachable.add(id));
  for (const secondary of neoBlock.secondaryDirectives ?? []) {
    reachable.add(secondary.directiveBlockId);
    reachable.add(secondary.triggerBlockId);
  }
  for (const merge of neoBlock.merges ?? []) {
    merge.sourceBlockIds.forEach((id) => reachable.add(id));
    reachable.add(merge.resultBlockId);
  }

  const unreachable = neoBlock.moltBlockIds.filter((id) => !reachable.has(id));
  if (unreachable.length) {
    diagnostics.push(
      warningDiagnostic(
        'UNREACHABLE_LOCAL_MOLT_BLOCK',
        'Local MOLT Blocks exist but are not reachable through Base Geometry, a Bundle, Secondary Directive, or Merge.',
        path,
        { blockIds: unreachable.sort() },
      ),
    );
  }
}

function validateScopeRef(scope: ScopeRef, indexes: Indexes, diagnostics: CompilerDiagnostic[], path: string): void {
  if (scope.kind === 'neostack' && !indexes.neoStacks.has(scope.neoStackId)) {
    diagnostics.push(
      errorDiagnostic('UNKNOWN_SCOPED_NEOSTACK', `Unknown NeoStack ${scope.neoStackId}.`, path),
    );
  }
}

function validateScopedAttachments(sleeve: Sleeve, indexes: Indexes, diagnostics: CompilerDiagnostic[]): void {
  const validateOne = (attachment: { id: string; blockId: string; scope: ScopeRef }, path: string): void => {
    const block = indexes.moltBlocks.get(attachment.blockId);
    if (!block) {
      diagnostics.push(errorDiagnostic('UNKNOWN_SCOPED_MOLT_BLOCK', `Unknown MOLT Block ${attachment.blockId}.`, path));
      return;
    }
    if (!SCOPED_MOLT_TYPES.includes(block.type as (typeof SCOPED_MOLT_TYPES)[number])) {
      diagnostics.push(
        errorDiagnostic(
          'SCOPED_MOLT_TYPE_UNSUPPORTED',
          `vNext scoped MOLT supports Instruction, Philosophy, and Blueprint only; received ${block.type}.`,
          path,
        ),
      );
    }
    validateScopeRef(attachment.scope, indexes, diagnostics, `${path}.scope`);
  };

  (sleeve.scopedMolt ?? []).forEach((attachment, index) =>
    validateOne(attachment, `scopedMolt[${index}]`),
  );

  const overlayIds = (sleeve.overlays ?? []).map((overlay) => overlay.id);
  const overlayDupes = duplicates(overlayIds);
  if (overlayDupes.length) {
    diagnostics.push(
      errorDiagnostic('DUPLICATE_OVERLAY_ID', 'Overlay IDs must be unique.', 'overlays', {
        duplicateIds: overlayDupes,
      }),
    );
  }
  for (const overlay of sleeve.overlays ?? []) {
    overlay.attachments.forEach((attachment, index) =>
      validateOne(attachment, `overlays.${overlay.id}.attachments[${index}]`),
    );
  }
}

function validateNeoStackRows(stack: NeoStack, diagnostics: CompilerDiagnostic[]): void {
  validateModuleRows(stack.neoBlockRows, `neoStacks.${stack.id}.neoBlockRows`, diagnostics);
  validateModuleRows(stack.childStackRows ?? [], `neoStacks.${stack.id}.childStackRows`, diagnostics);
}

export function validateCanonicalSleeve(sleeve: Sleeve): ValidationResult {
  const diagnostics: CompilerDiagnostic[] = [];

  if (sleeve.schemaVersion !== 'umg.compiler-vnext.sleeve.v0.1') {
    diagnostics.push(
      errorDiagnostic(
        'UNSUPPORTED_SLEEVE_SCHEMA',
        `Expected umg.compiler-vnext.sleeve.v0.1; received ${String(sleeve.schemaVersion)}.`,
        'schemaVersion',
      ),
    );
  }

  const indexes = buildIndexes(sleeve, diagnostics);

  if (!indexes.neoStacks.has(sleeve.controllerNeoStackId)) {
    diagnostics.push(
      errorDiagnostic(
        'UNKNOWN_CONTROLLER_NEOSTACK',
        `Controller NeoStack ${sleeve.controllerNeoStackId} does not exist.`,
        'controllerNeoStackId',
      ),
    );
  }
  if (indexes.parentByStackId.has(sleeve.controllerNeoStackId)) {
    diagnostics.push(
      errorDiagnostic(
        'CONTROLLER_HAS_PARENT',
        'Controller NeoStack must be the apex and cannot have a parent.',
        'controllerNeoStackId',
      ),
    );
  }

  validateNoStackCycles(indexes, diagnostics);
  const reachableStacks = reachableStacksFromController(sleeve.controllerNeoStackId, indexes);
  sleeve.neoStacks
    .filter((stack) => stack.id !== sleeve.controllerNeoStackId)
    .forEach((stack) => {
      if (!indexes.parentByStackId.has(stack.id)) {
        diagnostics.push(
          errorDiagnostic(
            'ORPHAN_NEOSTACK',
            `NeoStack ${stack.id} must have exactly one parent beneath the Controller NeoStack.`,
            `neoStacks.${stack.id}`,
            {
              controllerNeoStackId: sleeve.controllerNeoStackId,
              reason: 'no_parent',
            },
          ),
        );
        return;
      }

      if (indexes.neoStacks.has(sleeve.controllerNeoStackId) && !reachableStacks.has(stack.id)) {
        diagnostics.push(
          errorDiagnostic(
            'ORPHAN_NEOSTACK',
            `NeoStack ${stack.id} is not reachable from Controller NeoStack ${sleeve.controllerNeoStackId}.`,
            `neoStacks.${stack.id}`,
            {
              controllerNeoStackId: sleeve.controllerNeoStackId,
              reason: 'not_reachable_from_controller',
            },
          ),
        );
      }
    });
  sleeve.neoStacks.forEach((stack) => validateNeoStackRows(stack, diagnostics));
  sleeve.neoBlocks.forEach((neoBlock) => validateNeoBlock(neoBlock, indexes, diagnostics));
  validateScopedAttachments(sleeve, indexes, diagnostics);

  for (const neoBlock of sleeve.neoBlocks) {
    if (!indexes.stackByNeoBlockId.has(neoBlock.id)) {
      diagnostics.push(
        errorDiagnostic(
          'NEOBLOCK_WITHOUT_NEOSTACK',
          `NeoBlock ${neoBlock.id} is not placed in any NeoStack.`,
          `neoBlocks.${neoBlock.id}`,
        ),
      );
    }
  }

  for (const rule of sleeve.governance ?? []) {
    for (const id of rule.offNeoStackIds ?? []) {
      if (!indexes.neoStacks.has(id)) {
        diagnostics.push(
          errorDiagnostic('UNKNOWN_GOVERNANCE_NEOSTACK_TARGET', `Unknown Governance NeoStack target ${id}.`, `governance.${rule.id}`),
        );
      }
    }
    for (const id of rule.offNeoBlockIds ?? []) {
      if (!indexes.neoBlocks.has(id)) {
        diagnostics.push(
          errorDiagnostic('UNKNOWN_GOVERNANCE_NEOBLOCK_TARGET', `Unknown Governance NeoBlock target ${id}.`, `governance.${rule.id}`),
        );
      }
    }
  }

  return { diagnostics };
}

export function validateCanonicalSelection(sleeve: Sleeve, selection: CompileSelection): ValidationResult {
  const diagnostics: CompilerDiagnostic[] = [];
  const source = validateCanonicalSleeve(sleeve);
  diagnostics.push(...source.diagnostics);

  if (selection.schemaVersion !== 'umg.compiler-vnext.selection.v0.1') {
    diagnostics.push(
      errorDiagnostic(
        'UNSUPPORTED_SELECTION_SCHEMA',
        `Expected umg.compiler-vnext.selection.v0.1; received ${String(selection.schemaVersion)}.`,
        'selection.schemaVersion',
      ),
    );
  }
  if (!selection.compiledAt || Number.isNaN(Date.parse(selection.compiledAt))) {
    diagnostics.push(
      errorDiagnostic(
        'INVALID_COMPILED_AT',
        'Selection compiledAt must be an explicit ISO-8601 timestamp supplied by the caller.',
        'selection.compiledAt',
      ),
    );
  }
  if (
    selection.routeRationale !== undefined &&
    (selection.routeRationale === null ||
      Array.isArray(selection.routeRationale) ||
      typeof selection.routeRationale !== 'object')
  ) {
    diagnostics.push(
      errorDiagnostic(
        'INVALID_ROUTE_RATIONALE',
        'Selection routeRationale must be a JSON object when supplied.',
        'selection.routeRationale',
      ),
    );
  }

  const stackIds = new Set(sleeve.neoStacks.map((stack) => stack.id));
  const blockIds = new Set(sleeve.neoBlocks.map((block) => block.id));
  const moltBlocks = new Map(sleeve.moltBlocks.map((block) => [block.id, block]));
  const overlayIds = new Set((sleeve.overlays ?? []).map((overlay) => overlay.id));
  const governanceIds = new Set((sleeve.governance ?? []).map((rule) => rule.id));

  const validateIds = (ids: string[] | undefined, known: Set<string>, code: string, path: string): void => {
    for (const id of ids ?? []) {
      if (!known.has(id)) diagnostics.push(errorDiagnostic(code, `Unknown ID ${id}.`, path));
    }
    const dupes = duplicates(ids ?? []);
    if (dupes.length) {
      diagnostics.push(
        errorDiagnostic('DUPLICATE_SELECTION_ID', 'Selection ID lists must not contain duplicates.', path, {
          duplicateIds: dupes,
        }),
      );
    }
  };

  validateIds(selection.activeNeoStackIds, stackIds, 'UNKNOWN_ACTIVE_NEOSTACK', 'selection.activeNeoStackIds');
  validateIds(selection.activeNeoBlockIds, blockIds, 'UNKNOWN_ACTIVE_NEOBLOCK', 'selection.activeNeoBlockIds');
  validateIds(selection.disabledNeoStackIds, stackIds, 'UNKNOWN_DISABLED_NEOSTACK', 'selection.disabledNeoStackIds');
  validateIds(selection.disabledNeoBlockIds, blockIds, 'UNKNOWN_DISABLED_NEOBLOCK', 'selection.disabledNeoBlockIds');
  validateIds(selection.activeOverlayIds, overlayIds, 'UNKNOWN_ACTIVE_OVERLAY', 'selection.activeOverlayIds');
  validateIds(
    selection.activeGovernanceRuleIds,
    governanceIds,
    'UNKNOWN_ACTIVE_GOVERNANCE_RULE',
    'selection.activeGovernanceRuleIds',
  );

  for (const triggerId of Object.keys(selection.triggerState).sort()) {
    const block = moltBlocks.get(triggerId);
    if (!block) {
      diagnostics.push(
        errorDiagnostic(
          'UNKNOWN_TRIGGER_STATE_ID',
          `Trigger state references unknown Trigger ${triggerId}.`,
          `selection.triggerState.${triggerId}`,
        ),
      );
      continue;
    }
    if (block.type !== 'trigger') {
      diagnostics.push(
        errorDiagnostic(
          'TRIGGER_STATE_TYPE_MISMATCH',
          `Trigger state ID ${triggerId} references ${block.type}, not trigger.`,
          `selection.triggerState.${triggerId}`,
          { actualType: block.type, expectedType: 'trigger' },
        ),
      );
    }
  }

  if (!selection.activeNeoStackIds.includes(sleeve.controllerNeoStackId)) {
    diagnostics.push(
      errorDiagnostic(
        'CONTROLLER_NOT_SELECTED',
        'Every compile selection must explicitly include the Controller NeoStack.',
        'selection.activeNeoStackIds',
      ),
    );
  }

  return { diagnostics };
}

export function validateSleeve(sleeve: unknown): ValidationResult {
  try {
    const structural = structurallyValidateSleeve(sleeve);
    if (!structural.ok) return { diagnostics: structural.diagnostics };
    return validateCanonicalSleeve(structural.value);
  } catch {
    return { diagnostics: [internalCompilerErrorDiagnostic()] };
  }
}

export function validateSelection(sleeve: unknown, selection: unknown): ValidationResult {
  try {
    const structuralSleeve = structurallyValidateSleeve(sleeve);
    const structuralSelection = structurallyValidateSelection(selection);
    if (!structuralSleeve.ok || !structuralSelection.ok) {
      const diagnostics: CompilerDiagnostic[] = [];
      if (!structuralSleeve.ok) diagnostics.push(...structuralSleeve.diagnostics);
      if (!structuralSelection.ok) diagnostics.push(...structuralSelection.diagnostics);
      return { diagnostics };
    }

    return validateCanonicalSelection(structuralSleeve.value, structuralSelection.value);
  } catch {
    return { diagnostics: [internalCompilerErrorDiagnostic()] };
  }
}
