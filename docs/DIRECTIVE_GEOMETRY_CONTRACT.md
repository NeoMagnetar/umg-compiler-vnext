# Object Chain

MOLT Block -> NeoBlock -> NeoStack -> Sleeve

# Prime Directive

Exactly one `primeDirectiveId`.

It references one local Directive.

Prime is Directive row 1 anchor.

# Base Directive Geometry

`baseGeometry.directive` contains exactly:

row 1
`primeDirectiveId` only

# Secondary Directives

Explicit relation:

`id`
`directiveBlockId`
`triggerBlockId`
`bundles` optional

Prime cannot also be Secondary.

One Trigger cannot bind multiple Secondary relations.

Multiple simultaneous matches remain invalid under B1.

# Non-Prime Local Directives

Must participate explicitly through:

Secondary Directive
or
Merge source/result

Orphan local Directive is invalid.

Do not finalize B3 Merge placement semantics here.

# Controller Root

`controllerNeoStackId` is the unique topology root.

It cannot have a parent.

# NeoStack Parent Law

Every non-controller NeoStack has exactly one parent.

No multiple-parent DAG topology in this version.

# Controller Reachability

Every NeoStack must be reachable from Controller.

Disconnected trees are invalid.

# Cycle Law

Self-cycle:
invalid

two-stack cycle:
invalid

multi-stack cycle:
invalid

# NeoStack Rows

Rows:

positive integers
one-based
contiguous
unique
non-empty

Vertical row order is authored structural order.

Numbers are ordinals, not weights.

# Horizontal NeoStack Peers

Same parent + same row = peers.

Left-to-right list order is deterministic authored order only.

It does not confer semantic authority.

# Selection Order Invariance

Selection arrays declare membership.

They do not create structural order.

Sleeve geometry remains authoritative.

# NeoBlock Placement

Every canonical NeoBlock belongs to exactly one NeoStack.

Zero placements:
invalid

multiple placements:
invalid

# NeoBlock Rows

Same row principles as NeoStack rows.

Same-row NeoBlocks are peers.

# Skill

`NeoStack.skill` is context metadata only.

It creates no:

authority
selection
state
Governance
MOLT semantics

# Forbidden Concepts

No Priority.
No weights.
No semantic authority from horizontal ordering.

Do not document B3/B4/B5 contracts as final.
