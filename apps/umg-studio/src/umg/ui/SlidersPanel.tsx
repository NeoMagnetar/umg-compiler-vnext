import { useUmgStore } from "../store";

export function SlidersPanel() {
  const { preview, setPreview } = useUmgStore();

  return (
    <div style={{ display: "grid", gap: 10, marginBottom: 10 }}>
      <Slider
        label="Semantic Overlap"
        value={preview.semanticOverlap}
        onChange={(v) => setPreview({ semanticOverlap: v })}
      />
      <Slider
        label="Governance Priority"
        value={preview.governancePriority}
        onChange={(v) => setPreview({ governancePriority: v })}
      />
    </div>
  );
}

function Slider(props: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div style={{ fontSize: 12, marginBottom: 4, color: "#e0e0e0" }}>
        {props.label}: <b>{props.value.toFixed(2)}</b>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={props.value}
        onChange={(e) => props.onChange(parseFloat(e.target.value))}
        style={{ width: "100%" }}
        data-testid={`slider-${props.label.toLowerCase().replace(/\s+/g, '-')}`}
      />
    </div>
  );
}
