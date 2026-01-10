import React from "react";

interface RuntimeViewerProps {
  runtime: any;
}

export default function RuntimeViewer({ runtime }: RuntimeViewerProps) {
  if (!runtime) {
    return <p className="small" style={{ opacity: 0.5 }}>No runtime data</p>;
  }

  const { sleeveId, neoBlocks, indexes, promptSpec } = runtime;

  return (
    <div className="small">
      <div style={{ marginBottom: 12 }}>
        <strong>Sleeve:</strong> {sleeveId}
      </div>
      <div style={{ marginBottom: 12 }}>
        <strong>NeoBlocks:</strong> {neoBlocks?.length ?? 0}
      </div>
      <div style={{ marginBottom: 12 }}>
        <strong>Tags:</strong> {indexes?.tags?.allTagsSorted?.join(", ") ?? "none"}
      </div>
      <div style={{ marginBottom: 12 }}>
        <strong>PromptSpec Sections:</strong> {promptSpec?.neoBlockPrompts?.length ?? 0}
      </div>
    </div>
  );
}
