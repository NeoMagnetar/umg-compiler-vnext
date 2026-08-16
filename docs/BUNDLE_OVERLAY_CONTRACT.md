# Bundle Definition

Bundle is one NeoBlock-local alternate geometry for exactly one MOLT type.

It does not synthesize semantics, convert a MOLT type, or create authority.

Trigger and Directive are excluded from Bundle.

# Same-MOLT Law

Each Bundle declares exactly one `moltType`.

Its rows may contain only same-type local MOLT Blocks from the owning NeoBlock.

There is no mixed-type Bundle Set object.

# Bundle Selection

Bundle selection is explicit through one selected Secondary Directive relation.

Each lane key inside `secondary.bundles` selects one same-type Bundle by id.

# Base Fallback

If a selected Secondary Directive omits a Bundle for a lane, that lane falls back to Base Geometry.

Bundle selection is lane-specific, not all-or-nothing.

# Bundle Omissions

When a Bundle replaces one local lane geometry, omitted local same-type MOLT Blocks are simply nonparticipating in that effective lane geometry.

They do not become OFF, DISABLED, deleted, or persistently stateful.

# Bundle + Scoped MOLT

Scoped MOLT is independent from local Bundle geometry.

Bundle changes local rows only.

Scoped MOLT remains additive context alongside Bundle-selected local rows.

# Scoped MOLT Types

Supported scoped MOLT types are:

`instruction`
`philosophy`
`blueprint`

Other MOLT types fail closed.

# Scope Propagation

Supported authored scopes are:

`sleeve`
`neostack`

`neostack` scope applies to that NeoStack and all descendants.

There are no query, tag, or dynamic scopes in B3A.

# Broad-To-Narrow Order

Scoped MOLT is ordered from broader scope to narrower scope.

`sleeve` precedes `neostack`.

# Same-Depth Authored Order

When multiple scoped attachments share the same scope depth, authored attachment array order is authoritative.

Attachment ids identify provenance only.

They do not create semantic read order.

# Overlay Definition

Overlay is temporary explicit additive scoped cognition.

Overlay attachments obey the same scoped-MOLT type and scope rules as authored scoped MOLT.

# Overlay Additive-Only Law

Overlay never deletes, replaces, suppresses, or mutates authored local geometry.

Overlay never changes a MOLT type, creates authority, selects NeoStacks, selects NeoBlocks, restores OFF cognition, restores DISABLED cognition, bypasses Governance, or performs Merge.

# Overlay Order

Effective scoped order for one active NeoBlock is:

1. authored scoped MOLT
2. active Overlay contributions

Within authored scoped MOLT:

broad to narrow
same depth uses authored attachment order

Within active Overlays:

Sleeve Overlay declaration order

Within one Overlay:

broad to narrow
same depth uses authored attachment order

# activeOverlayIds Membership-Only Law

`selection.activeOverlayIds` declares Overlay membership only.

Caller array order does not create semantic order.

Overlay declaration order in the Sleeve remains authoritative.

# Inactive Overlay Behavior

An Overlay declared in the Sleeve but absent from `activeOverlayIds` is inert.

Its existence alone does not change RuntimeSpec semantics or runtime hash.

An active Overlay scoped only to an unselected READY region is also inert for that compile.

# Overlay Provenance

Overlay contributions remain inspectable through:

`sourceMode = overlay`
`overlayId`
`sourceId` / attachment id
`sourceScope`
`neoStackId`
`neoBlockId`
`moltType`

# No Hidden Dedupe

Distinct explicit scoped or Overlay attachments are preserved even when they reference the same MOLT Block.

The compiler does not silently deduplicate those provenance contributions.

# State / Governance Boundary

OFF and DISABLED remain B1 execution boundaries.

Bundle, scoped MOLT, and Overlay do not revive blocked NeoStacks or NeoBlocks.

Governance remains extra-MOLT and is not redesigned here.

# No Persistent MOLT State

B3A does not add persistent per-MOLT runtime state machinery.

Bundle omissions and Overlay inactivity are compile-time composition outcomes only.

# Deferred B3B Concerns

B3A does not freeze Merge chaining, Merge placement, Governance redesign, RuntimeSpec field redesign, Trace registry redesign, diagnostic overhaul, or hash-policy redesign.
