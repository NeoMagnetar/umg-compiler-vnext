export default function Home() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>UMG Repo Shell (client)</h1>
      <p>Express is running on port 5000.</p>
      <p>
        Studio dev server should run on port 5173:
        {" "}
        <a href="http://localhost:5173" target="_blank" rel="noreferrer">
          http://localhost:5173
        </a>
      </p>
    </div>
  );
}
