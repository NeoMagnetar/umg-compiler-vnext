# UMG Studio Integration Guide

## Current fallback

Preserve manual export/import as a supported handoff:

1. Studio exports an explicit `CompileRequest` containing Sleeve and `CompileSelection`.
2. An operator or external tool invokes the compiler.
3. Studio imports the returned `CompileResult` for display and runtime handoff.

This keeps Studio and compiler deployment independent while preserving the exact contract.

## Future direct mode

```text
Studio
  -> CompileRequest
  -> compiler service
  -> CompileResult
  -> Studio adapter/display
       -> RuntimeSpec to runtime boundary on success
       -> Trace to forensic display
       -> Diagnostics to validation/error display
```

**Normative:**

- Studio or its controller is responsible for interpretation and explicit selection.
- The compiler service receives Sleeve plus `CompileSelection` and returns `CompileResult` unchanged.
- Studio must branch on `status`; it must not access `runtime` on failure.
- `RuntimeSpec` is executable authority; Trace and Diagnostics are observability surfaces.
- Version identity must be checked explicitly. Compatibility is not inferred from semver.
- No compiler-v0 concept is silently translated, upgraded, or mapped into vNext.

**Non-normative:** A Studio adapter may maintain view models for diagnostics and trace events, but should retain the original `CompileResult` for audit and debugging. Network correlation IDs belong in the transport envelope, not inside the frozen compiler contract.

H3 does not modify UMG Studio or enable direct mode. The server adapter is an example boundary for future integration work.
