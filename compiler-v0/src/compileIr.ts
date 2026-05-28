import {
  finalizeDiagnostics,
  makeDiagnostics,
  pushError,
  pushInfo,
  pushWarning,
} from "./diagnostics.js";
import type {
  CanonicalIr,
  CompileIrResult,
  RuntimeSpecOutput,
  TraceEventOutput,
  TraceOutput,
} from "./irTypes.js";
import { validateCanonicalIr, validateRuntimeSpec, validateTrace } from "./schemaValidation.js";

function event(id: number, eventType: string, reason: string, artifactRefs: string[] = [], sourceRefs: string[] = []): TraceEventOutput {
  return {
    event_id: `evt_${String(id).padStart(4, "0")}`,
    event_type: eventType,
    pass: id,
    timestamp: null,
    artifact_refs: artifactRefs,
    decision: reason,
    reason,
    inputs: null,
    outputs: null,
    diagnostic_level: "info",
    source_refs: sourceRefs,
  };
}

export function compileIr(ir: CanonicalIr): CompileIrResult {
  const diagnostics = makeDiagnostics();

  const irValidation = validateCanonicalIr(ir);
  diagnostics.errors.push(...irValidation.errors);
  diagnostics.warnings.push(...irValidation.warnings);
  diagnostics.info.push(...irValidation.info);

  if (irValidation.errors.length > 0) {
    return {
      runtimeSpec: {
        runtime_spec_version: "0.1",
        runtime_spec_id: "",
        source_ir_id: ir?.ir_id ?? "",
        active_sleeve: "",
        active_route: "",
        active_neostacks: [],
        active_neoblocks: [],
        active_molt_blocks: [],
        bundles: [],
        overlays: [],
        runtime_slots: [],
        excluded: [],
        merge_outputs: [],
        capabilities: [],
        services: [],
        state: {},
        diagnostics: [],
      },
      trace: {
        trace_version: "0.1",
        trace_id: "",
        source_ir_id: ir?.ir_id ?? "",
        runtime_spec_id: null,
        compiler: {
          name: "umg-compiler",
          version: "v0",
          profile: "compile-ir",
        },
        events: [],
        diagnostics: [],
        summary: { status: "schema_invalid_ir" },
      },
      diagnostics: finalizeDiagnostics(diagnostics),
    };
  }

  const nodeArtifacts = ir.nodes.map((node) => node.artifact_ref).filter((v): v is string => Boolean(v));
  const activeSleeve =
    ir.source?.sleeve_id ??
    ir.nodes.find((node) => node.node_type === "sleeve")?.artifact_ref ??
    ir.nodes.find((node) => node.node_type === "sleeve")?.node_id ??
    "UNKNOWN.SLEEVE";

  const firstRoute = ir.routes?.[0];
  const activeRoute =
    typeof firstRoute === "string"
      ? firstRoute
      : typeof firstRoute === "object" && firstRoute !== null && "route_id" in firstRoute
        ? String((firstRoute as Record<string, unknown>).route_id)
        : typeof ir.states?.default_route === "string"
          ? ir.states.default_route
          : "route.default";

  const activeNeostacks = ir.nodes
    .filter((node) => node.node_type === "neostack")
    .map((node) => node.artifact_ref ?? node.node_id);

  const activeNeoblocks = ir.nodes
    .filter((node) => node.node_type === "neoblock")
    .map((node) => node.artifact_ref ?? node.node_id);

  const overlays = Array.isArray(ir.overlays) ? [...ir.overlays] : [];
  const bundles = Array.isArray(ir.bundles) ? [...ir.bundles] : [];
  const capabilities = Array.isArray(ir.capabilities) ? [...ir.capabilities] : [];

  const runtimeSpec: RuntimeSpecOutput = {
    runtime_spec_version: "0.1",
    runtime_spec_id: `RS.${ir.ir_id}`,
    source_ir_id: ir.ir_id,
    active_sleeve: activeSleeve,
    active_route: activeRoute,
    active_neostacks: activeNeostacks,
    active_neoblocks: activeNeoblocks,
    active_molt_blocks: [],
    bundles,
    overlays,
    runtime_slots: [
      { slot_id: "slot.compiler.ir", state: "ready" },
      { slot_id: "slot.compiler.runtime_spec", state: "ready" },
      { slot_id: "slot.compiler.trace", state: "ready" },
    ],
    excluded: [],
    merge_outputs: [],
    capabilities,
    services: ["compiler", "trace"],
    state: {
      ir_version: ir.ir_version,
      node_count: ir.nodes.length,
      edge_count: ir.edges.length,
      priority_profile: ir.priority_profile ?? null,
      compiler_mode: "canonical_ir",
      artifact_kind: "runtime_spec",
      non_executing: true,
      boundary_note: "RuntimeSpec is a non-executing compiler artifact and does not grant permission or perform execution.",
    },
    diagnostics: [],
  };

  const trace: TraceOutput = {
    trace_version: "0.1",
    trace_id: `TR.${ir.ir_id}`,
    source_ir_id: ir.ir_id,
    runtime_spec_id: runtimeSpec.runtime_spec_id,
    compiler: {
      name: "umg-compiler",
      version: "v0",
      profile: "compile-ir",
    },
    events: [
      event(1, "ir.accepted", "Accepted canonical IR input.", [ir.ir_id]),
      event(2, "runtime_spec.emitted", "Emitted runtime spec from canonical IR.", nodeArtifacts),
      event(3, "trace.emitted", "Emitted deterministic compiler trace as audit/provenance artifact; not permission and not execution.", [runtimeSpec.runtime_spec_id]),
    ],
    diagnostics: [],
    summary: {
      status: "ok",
      mode: "canonical_ir",
      active_route: String(activeRoute),
    },
  };

  const runtimeValidation = validateRuntimeSpec(runtimeSpec);
  diagnostics.errors.push(...runtimeValidation.errors);
  diagnostics.warnings.push(...runtimeValidation.warnings);
  diagnostics.info.push(...runtimeValidation.info);

  const traceValidation = validateTrace(trace);
  diagnostics.errors.push(...traceValidation.errors);
  diagnostics.warnings.push(...traceValidation.warnings);
  diagnostics.info.push(...traceValidation.info);

  if (diagnostics.errors.length === 0) {
    pushInfo(diagnostics, "COMPILE_IR_OK", "Canonical IR compile path completed successfully.");
  } else {
    pushError(diagnostics, "COMPILE_IR_OUTPUT_INVALID", "One or more emitted outputs failed schema validation.");
  }

  if ((ir.diagnostics?.length ?? 0) > 0) {
    pushWarning(diagnostics, "IR_INPUT_DIAGNOSTICS_PRESENT", "Input IR carried diagnostics from upstream source.");
  }

  return {
    runtimeSpec,
    trace,
    diagnostics: finalizeDiagnostics(diagnostics),
  };
}
