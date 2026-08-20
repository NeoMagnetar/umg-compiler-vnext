# UMG vNext Authoring Guidance

## How to read this guide

Unless a paragraph is explicitly labeled **Normative**, this document is **Non-normative** authoring advice. It explains useful patterns observed during design review and does not create new validation rules, authority levels, or conformance requirements.

For frozen requirements, use the H1 conformance documents, public schemas, registries, and compiler output.

## Prime Directive

**Normative:** Each NeoBlock has exactly one local Prime Directive selected by `primeDirectiveId`, and the Directive base geometry contains the Prime Directive row only.

**Non-normative:** Treat the Prime Directive as one explicit local intent anchor. Keep it stable and direct rather than using it as a container for every contextual fact.

## Secondary Directives

**Normative:** A Secondary Directive is explicitly bound to a Trigger. Zero matches uses Prime only; one match selects that Secondary Directive; multiple matches fail with `MULTIPLE_SECONDARY_DIRECTIVE_MATCH` in v0.1.

**Non-normative:** Use Secondary Directives for explicit operating modes such as safety, escalation, or focused response. Do not create one for every independent contextual fact; context usually belongs in appropriate MOLT lanes, scoped attachments, or overlays.

## Overlay

**Normative:** Overlays are explicit selected attachments and may contribute only through supported scoped MOLT types and scopes.

**Non-normative:** Use an Overlay for temporary additive cognition that should be activated by the caller without changing the underlying Sleeve.

## Scoped MOLT

**Normative:** v0.1 scoped types are Instruction, Philosophy, and Blueprint. Effective scoped cognition is inherited through allowed explicit Sleeve/NeoStack scopes and retains provenance.

**Non-normative:** Use scoped MOLT for context intentionally inherited by a subtree. Prefer the narrowest scope that matches the intended audience.

## Governance

**Normative:** Governance supplies hard `OFF` authority in v0.1. Explicit selection blocked by Governance fails closed; the compiler does not silently drop blocked selections.

**Non-normative:** Reserve Governance for hard exclusion policy. Ordinary preferences and context should not be modeled as Governance.

## Merge and Authority Non-Escalation

**Normative:** Merge outputs are pre-authored. Merge does not generate prose and cannot escalate authority beyond its sources.

Worked examples:

```text
directive + blueprint -> directive
LEGAL: Directive authority already exists among the sources.

instruction + philosophy -> directive
ILLEGAL: no Directive authority exists among the sources.
```

**Non-normative:** Use Merge when the authored result needs explicit provenance from multiple source blocks. Author the result block first, then verify its type does not exceed the highest authority represented by the declared sources.
