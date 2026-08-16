import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RUNTIME_HASH_PROFILE_VERSION,
  buildRuntimeHashPayload,
  canonicalize,
  compileSleeve,
  computeRuntimeHash,
} from '../dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

function json(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sha256Utf8(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function resolvedNeoBlock(runtime, neoBlockId) {
  const neoBlock = runtime.resolvedNeoBlocks.find((item) => item.id === neoBlockId);
  assert.ok(neoBlock, `missing resolved NeoBlock ${neoBlockId}`);
  return neoBlock;
}

function resolvedLane(runtime, neoBlockId, moltType) {
  const lane = resolvedNeoBlock(runtime, neoBlockId).lanes.find((item) => item.moltType === moltType);
  assert.ok(lane, `missing ${moltType} lane for ${neoBlockId}`);
  return lane;
}

function promptPartById(runtime, partId) {
  const part = runtime.promptParts.find((item) => item.id === partId);
  assert.ok(part, `missing prompt part ${partId}`);
  return part;
}

const vectors = json('fixtures/hash/HASH_TEST_VECTORS.json');
const profile = json('schemas/RUNTIME_HASH_PROFILE.json');

assert.equal(profile.profileVersion, RUNTIME_HASH_PROFILE_VERSION);
assert.equal(profile.hashAlgorithm, 'SHA-256');
assert.equal(profile.encoding, 'UTF-8');
assert.equal(profile.unicodeNormalization, 'none');
assert.equal(profile.objectKeyOrderSignificant, false);
assert.equal(profile.arrayOrderSignificant, true);
assert.deepEqual(profile.includedTopLevelFields, [
  'runtimeSchemaVersion',
  'sleeveId',
  'controllerNeoStackId',
  'activeNeoStackIds',
  'resolvedNeoBlocks',
  'promptParts',
  'resetPlan',
]);
assert.deepEqual(profile.excludedMetadata, [
  'compilerVersion',
  'sleeveName',
  'compiledAt',
  'diagnostics',
  'runtimeHash',
]);

for (const vector of vectors) {
  assert.equal(canonicalize(vector.input), vector.expectedCanonicalJson, vector.name);
  assert.equal(sha256Utf8(vector.expectedCanonicalJson), vector.expectedSha256, vector.name);
}

assert.equal(
  canonicalize({
    keep: 1,
    omit: undefined,
    nested: { keep: 2, omit: undefined },
  }),
  '{"keep":1,"nested":{"keep":2}}',
);

const unsupportedCases = [
  { name: 'top-level-undefined', value: undefined },
  { name: 'array-undefined-entry', value: [1, undefined, 3] },
  { name: 'array-hole', value: [1, , 3] },
  { name: 'bigint', value: { bad: 1n } },
  { name: 'function', value: { bad: () => {} } },
  { name: 'symbol', value: { bad: Symbol('x') } },
  { name: 'nan', value: { bad: Number.NaN } },
  { name: 'infinity', value: { bad: Number.POSITIVE_INFINITY } },
  { name: 'negative-infinity', value: { bad: Number.NEGATIVE_INFINITY } },
];

for (const testCase of unsupportedCases) {
  assert.throws(() => canonicalize(testCase.value), TypeError, testCase.name);
}

const dealershipSleeve = json('fixtures/dealership.sleeve.json');
const normalSelection = json('fixtures/requests/normal.selection.json');
const secondaryBSelection = json('fixtures/requests/secondary-b.selection.json');
const routeRationaleSelection = json('fixtures/requests/route-rationale.selection.json');
const overlaySelection = json('fixtures/requests/secondary-b-overlay.selection.json');
const bundleSelection = json('fixtures/requests/bundle-reorder.selection.json');
const bundleSleeve = json('fixtures/bundle-reorder-base.sleeve.json');

const normal = compileSleeve(dealershipSleeve, normalSelection);
const secondaryB = compileSleeve(dealershipSleeve, secondaryBSelection);
const routeRationale = compileSleeve(dealershipSleeve, routeRationaleSelection);
const overlay = compileSleeve(dealershipSleeve, overlaySelection);
const bundle = compileSleeve(bundleSleeve, bundleSelection);

assert.equal(normal.status, 'success');
assert.equal(secondaryB.status, 'success');
assert.equal(routeRationale.status, 'success');
assert.equal(overlay.status, 'success');
assert.equal(bundle.status, 'success');

const baseHash = secondaryB.runtime.runtimeHash;

const invarianceCases = [
  {
    name: 'compilerVersion',
    mutate(runtime) {
      runtime.compilerVersion = '9.9.9-test';
    },
  },
  {
    name: 'compiledAt',
    mutate(runtime) {
      runtime.compiledAt = '1999-12-31T23:59:59.999Z';
    },
  },
  {
    name: 'sleeveName',
    mutate(runtime) {
      runtime.sleeveName = `${runtime.sleeveName} renamed`;
    },
  },
  {
    name: 'neoblock-name',
    mutate(runtime) {
      runtime.resolvedNeoBlocks[0].name = `${runtime.resolvedNeoBlocks[0].name} renamed`;
    },
  },
  {
    name: 'resolved-molt-title',
    mutate(runtime) {
      resolvedLane(runtime, 'NB.SERVICE.TRIAGE', 'instruction').rows[0].blocks[0].title = 'retitled lane block';
    },
  },
  {
    name: 'promptpart-title',
    mutate(runtime) {
      promptPartById(runtime, 'I.SVC.06').title = 'retitled prompt part';
    },
  },
  {
    name: 'diagnostics',
    mutate(runtime) {
      runtime.diagnostics = [
        {
          code: 'HASH_TEST_WARNING',
          level: 'warning',
          stage: 'semantic',
          subject: { kind: 'selection' },
          message: 'hash test warning',
        },
      ];
    },
  },
];

for (const testCase of invarianceCases) {
  const mutated = clone(secondaryB.runtime);
  testCase.mutate(mutated);
  assert.equal(computeRuntimeHash(mutated), baseHash, testCase.name);
}

assert.equal(routeRationale.runtime.runtimeHash, secondaryB.runtime.runtimeHash, 'route-rationale');
assert.deepEqual(
  canonicalize(buildRuntimeHashPayload(routeRationale.runtime)),
  canonicalize(buildRuntimeHashPayload(secondaryB.runtime)),
  'trace-only route rationale exclusion',
);

function expectHashChange(name, runtime, mutate) {
  const mutated = clone(runtime);
  mutate(mutated);
  assert.notEqual(computeRuntimeHash(mutated), computeRuntimeHash(runtime), name);
}

expectHashChange('sleeveId', secondaryB.runtime, (runtime) => {
  runtime.sleeveId = 'SLV.TEST.MUTATED';
});

expectHashChange('controllerNeoStackId', secondaryB.runtime, (runtime) => {
  runtime.controllerNeoStackId = 'NS.TEST.MUTATED';
});

expectHashChange('activeNeoStackIds-membership', secondaryB.runtime, (runtime) => {
  runtime.activeNeoStackIds = runtime.activeNeoStackIds.slice(1);
  runtime.resetPlan.neoStackIds = runtime.activeNeoStackIds.slice();
});

expectHashChange('activeNeoStackIds-order', secondaryB.runtime, (runtime) => {
  runtime.activeNeoStackIds = runtime.activeNeoStackIds.slice().reverse();
  runtime.resetPlan.neoStackIds = runtime.activeNeoStackIds.slice();
});

expectHashChange('neoblock-id', secondaryB.runtime, (runtime) => {
  runtime.resolvedNeoBlocks[0].id = 'NB.TEST.MUTATED';
  runtime.promptParts = runtime.promptParts.map((part) =>
    part.neoBlockId === 'NB.SERVICE.TRIAGE' ? { ...part, neoBlockId: 'NB.TEST.MUTATED' } : part,
  );
  runtime.resetPlan.neoBlockIds = runtime.resolvedNeoBlocks.map((neoBlock) => neoBlock.id);
});

expectHashChange('secondaryDirectiveId', secondaryB.runtime, (runtime) => {
  runtime.resolvedNeoBlocks[0].secondaryDirectiveId = 'SD.TEST.MUTATED';
});

expectHashChange('activeTriggerIds', secondaryB.runtime, (runtime) => {
  resolvedNeoBlock(runtime, 'NB.SERVICE.TRIAGE').activeTriggerIds = ['T.SVC.SAFETY', 'T.TEST.MUTATED'];
});

expectHashChange('lane-type', secondaryB.runtime, (runtime) => {
  resolvedLane(runtime, 'NB.SERVICE.TRIAGE', 'instruction').moltType = 'subject';
});

expectHashChange('lane-order', secondaryB.runtime, (runtime) => {
  const lanes = resolvedNeoBlock(runtime, 'NB.SERVICE.TRIAGE').lanes.slice();
  const [first, second, ...rest] = lanes;
  resolvedNeoBlock(runtime, 'NB.SERVICE.TRIAGE').lanes = [second, first, ...rest];
});

expectHashChange('geometrySource', bundle.runtime, (runtime) => {
  resolvedLane(runtime, 'NB.BUNDLE.ORDER', 'instruction').geometrySource = 'base';
});

expectHashChange('bundleId', bundle.runtime, (runtime) => {
  resolvedLane(runtime, 'NB.BUNDLE.ORDER', 'instruction').bundleId = 'BND.TEST.MUTATED';
});

expectHashChange('molt-id', secondaryB.runtime, (runtime) => {
  resolvedLane(runtime, 'NB.SERVICE.TRIAGE', 'instruction').rows[0].blocks[0].id = 'I.TEST.MUTATED';
});

expectHashChange('molt-type', secondaryB.runtime, (runtime) => {
  resolvedLane(runtime, 'NB.SERVICE.TRIAGE', 'instruction').rows[0].blocks[0].type = 'subject';
});

expectHashChange('molt-content', secondaryB.runtime, (runtime) => {
  resolvedLane(runtime, 'NB.SERVICE.TRIAGE', 'instruction').rows[0].blocks[0].content = 'Mutated content.';
});

expectHashChange('sourceMode', secondaryB.runtime, (runtime) => {
  resolvedLane(runtime, 'NB.SERVICE.TRIAGE', 'instruction').rows[3].blocks[0].sourceMode = 'local';
});

expectHashChange('sourceId', secondaryB.runtime, (runtime) => {
  resolvedLane(runtime, 'NB.SERVICE.TRIAGE', 'instruction').rows[3].blocks[0].sourceId = 'I.TEST.SOURCE';
});

expectHashChange('sourceScope', secondaryB.runtime, (runtime) => {
  resolvedLane(runtime, 'NB.SERVICE.TRIAGE', 'philosophy').scoped[0].sourceScope = {
    kind: 'neostack',
    neoStackId: 'NS.TEST.SOURCE',
  };
});

expectHashChange('overlayId', overlay.runtime, (runtime) => {
  resolvedLane(runtime, 'NB.SERVICE.TRIAGE', 'philosophy').scoped[1].overlayId = 'OVR.TEST.MUTATED';
});

expectHashChange('mergeId', secondaryB.runtime, (runtime) => {
  resolvedLane(runtime, 'NB.SERVICE.TRIAGE', 'instruction').rows[3].blocks[0].mergeId = 'MRG.TEST.MUTATED';
});

expectHashChange('geometry-order', bundle.runtime, (runtime) => {
  const lane = resolvedLane(runtime, 'NB.BUNDLE.ORDER', 'instruction');
  lane.rows = lane.rows.slice().reverse();
});

expectHashChange('promptPart-neoStackId', secondaryB.runtime, (runtime) => {
  promptPartById(runtime, 'I.SVC.06').neoStackId = 'NS.TEST.PROMPT';
});

expectHashChange('promptPart-neoBlockId', secondaryB.runtime, (runtime) => {
  promptPartById(runtime, 'I.SVC.06').neoBlockId = 'NB.TEST.PROMPT';
});

expectHashChange('promptPart-laneOrder', secondaryB.runtime, (runtime) => {
  promptPartById(runtime, 'I.SVC.06').laneOrder += 10;
});

expectHashChange('promptPart-scopeLayer', secondaryB.runtime, (runtime) => {
  promptPartById(runtime, 'I.SVC.06').scopeLayer += 10;
});

expectHashChange('promptPart-row', secondaryB.runtime, (runtime) => {
  promptPartById(runtime, 'I.SVC.06').row += 10;
});

expectHashChange('promptPart-column', secondaryB.runtime, (runtime) => {
  promptPartById(runtime, 'I.SVC.06').column += 10;
});

expectHashChange('resetPlan', secondaryB.runtime, (runtime) => {
  runtime.resetPlan.neoBlockIds = runtime.resetPlan.neoBlockIds.slice().reverse();
});

const payload = buildRuntimeHashPayload(secondaryB.runtime);
const mutatedPayload = clone(payload);
mutatedPayload.hashProfileVersion = `${payload.hashProfileVersion}.mutated`;
assert.notEqual(
  sha256Utf8(canonicalize(mutatedPayload)),
  secondaryB.runtime.runtimeHash,
  'hash-profile-version',
);

assert.equal(buildRuntimeHashPayload(secondaryB.runtime).hashProfileVersion, RUNTIME_HASH_PROFILE_VERSION);
assert.equal(buildRuntimeHashPayload(secondaryB.runtime).runtimeSchemaVersion, secondaryB.runtime.schemaVersion);

console.log('UMG compiler-vnext runtime hash contract tests: PASS');
console.log(`runtimeHash(normal): ${normal.runtime.runtimeHash}`);
console.log(`runtimeHash(secondary-b): ${secondaryB.runtime.runtimeHash}`);
console.log(`hash vectors: ${vectors.length + 1}`);
