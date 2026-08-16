export const compileCases = [
  {
    name: 'normal',
    sleevePath: 'fixtures/dealership.sleeve.json',
    selectionPath: 'fixtures/requests/normal.selection.json',
    expectedPath: 'fixtures/expected/normal.compile-result.json',
  },
  {
    name: 'secondary-b',
    sleevePath: 'fixtures/dealership.sleeve.json',
    selectionPath: 'fixtures/requests/secondary-b.selection.json',
    expectedPath: 'fixtures/expected/secondary-b.compile-result.json',
  },
  {
    name: 'secondary-c',
    sleevePath: 'fixtures/dealership.sleeve.json',
    selectionPath: 'fixtures/requests/secondary-c.selection.json',
    expectedPath: 'fixtures/expected/secondary-c.compile-result.json',
  },
  {
    name: 'secondary-b-overlay',
    sleevePath: 'fixtures/dealership.sleeve.json',
    selectionPath: 'fixtures/requests/secondary-b-overlay.selection.json',
    expectedPath: 'fixtures/expected/secondary-b-overlay.compile-result.json',
  },
  {
    name: 'multi-secondary-error',
    sleevePath: 'fixtures/dealership.sleeve.json',
    selectionPath: 'fixtures/requests/multi-secondary-error.selection.json',
    expectedPath: 'fixtures/expected/multi-secondary-error.compile-result.json',
  },
  {
    name: 'governance-off',
    sleevePath: 'fixtures/dealership.sleeve.json',
    selectionPath: 'fixtures/requests/governance-off.selection.json',
    expectedPath: 'fixtures/expected/governance-off.compile-result.json',
  },
  {
    name: 'disabled-sales',
    sleevePath: 'fixtures/dealership.sleeve.json',
    selectionPath: 'fixtures/requests/disabled-sales.selection.json',
    expectedPath: 'fixtures/expected/disabled-sales.compile-result.json',
  },
  {
    name: 'route-rationale',
    sleevePath: 'fixtures/dealership.sleeve.json',
    selectionPath: 'fixtures/requests/route-rationale.selection.json',
    expectedPath: 'fixtures/expected/route-rationale.compile-result.json',
  },
  {
    name: 'merge-directive',
    sleevePath: 'fixtures/merge-directive.sleeve.json',
    selectionPath: 'fixtures/requests/merge-directive.selection.json',
    expectedPath: 'fixtures/expected/merge-directive.compile-result.json',
  },
  {
    name: 'structure-routing',
    sleevePath: 'fixtures/structure-routing.sleeve.json',
    selectionPath: 'fixtures/requests/structure-routing.selection.json',
    expectedPath: 'fixtures/expected/structure-routing.compile-result.json',
  },
  {
    name: 'bundle-reorder-base',
    sleevePath: 'fixtures/bundle-reorder-base.sleeve.json',
    selectionPath: 'fixtures/requests/bundle-reorder.selection.json',
    expectedPath: 'fixtures/expected/bundle-reorder-base.compile-result.json',
  },
  {
    name: 'bundle-reorder-alt',
    sleevePath: 'fixtures/bundle-reorder-alt.sleeve.json',
    selectionPath: 'fixtures/requests/bundle-reorder.selection.json',
    expectedPath: 'fixtures/expected/bundle-reorder-alt.compile-result.json',
  },
];
