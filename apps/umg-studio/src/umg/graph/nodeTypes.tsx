export function BasicNode({ data }: any) {
  return (
    <div style={{
      padding: 10,
      border: "1px solid #333",
      borderRadius: 10,
      background: "rgba(20, 20, 25, 0.95)",
      minWidth: 180,
      color: "#e0e0e0"
    }}>
      <div style={{ fontWeight: 700 }}>{data.title}</div>
      <div style={{ fontSize: 12, opacity: 0.8 }}>{data.subtitle}</div>
    </div>
  );
}

export const nodeTypes = { basic: BasicNode };
