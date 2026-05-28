export function normalizeSleeveCompileResultForSemanticComparison(result: any) {
  return {
    hasErrors: result?.hasErrors ?? false,
    runtime: result?.runtime
      ? {
          ...result.runtime,
          meta: result.runtime.meta
            ? {
                ...result.runtime.meta,
                compiledAt: "VOLATILE_COMPILED_AT",
              }
            : result.runtime.meta,
        }
      : result?.runtime,
    trace: result?.trace
      ? {
          ...result.trace,
          events: Array.isArray(result.trace.events)
            ? result.trace.events.map((evt: any) => {
                const clone = { ...evt };
                clone.id = "VOLATILE_EVENT_ID";
                clone.timestamp = "VOLATILE_EVENT_TIMESTAMP";
                return clone;
              })
            : result.trace.events,
        }
      : result?.trace,
  };
}

export function normalizeIrCompileResultForSemanticComparison(result: any) {
  return {
    runtimeSpec: result?.runtimeSpec,
    trace: result?.trace
      ? {
          ...result.trace,
          events: Array.isArray(result.trace.events)
            ? result.trace.events.map((evt: any) => ({
                ...evt,
                event_id: "VOLATILE_EVENT_ID",
                timestamp: evt?.timestamp ?? null,
              }))
            : result.trace.events,
        }
      : result?.trace,
    diagnostics: result?.diagnostics,
  };
}
