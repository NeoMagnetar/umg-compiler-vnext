export default function Home() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#0a0a0a",
      color: "#fff",
      fontFamily: "Inter, sans-serif"
    }}>
      <h1 style={{ fontSize: 48, fontWeight: 700, marginBottom: 12 }}>
        UMG Compiler
      </h1>
      <p style={{ opacity: 0.6, fontSize: 18, marginBottom: 32 }}>
        Deterministic compilation pipeline for sleeve configurations
      </p>
      <div style={{
        display: "flex",
        gap: 16,
        flexWrap: "wrap",
        justifyContent: "center"
      }}>
        <a
          href="https://replit.com/@YOUR_REPL/umg-studio"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: "12px 24px",
            background: "#a855f7",
            color: "#fff",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 500,
            transition: "opacity 0.2s"
          }}
          data-testid="link-studio"
        >
          Open UMG Studio
        </a>
        <a
          href="/api/docs"
          style={{
            padding: "12px 24px",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 500
          }}
          data-testid="link-docs"
        >
          Documentation
        </a>
      </div>
      <div style={{
        marginTop: 64,
        padding: 24,
        background: "rgba(255,255,255,0.05)",
        borderRadius: 12,
        maxWidth: 600,
        textAlign: "center"
      }}>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>Compiler Features</h3>
        <ul style={{
          listStyle: "none",
          padding: 0,
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          justifyContent: "center",
          opacity: 0.7,
          fontSize: 14
        }}>
          <li>7 MOLT Types</li>
          <li>Priority Resolution</li>
          <li>Bundle/Merge Ops</li>
          <li>Tag Indexing</li>
          <li>Trace Events</li>
        </ul>
      </div>
    </div>
  );
}
