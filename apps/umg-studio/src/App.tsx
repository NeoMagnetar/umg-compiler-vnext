import React, { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import TopBar from "@/components/TopBar";
import LeftPanel from "@/components/LeftPanel";
import GraphCanvas from "@/components/GraphCanvas";
import RightPanel from "@/components/RightPanel";
import { compileFromJson } from "@/lib/compile";
import { loadSleeveJson, saveSleeveJson } from "@/lib/storage";
import fixture from "@/fixtures/sleeve.minimal.json?raw";

export default function App() {
  const [sleeveJson, setSleeveJson] = useState(() => loadSleeveJson(fixture));
  const [resultJson, setResultJson] = useState<string>(() => {
    const c = compileFromJson(loadSleeveJson(fixture));
    return JSON.stringify(c.result ?? { hasErrors: true, error: c.error }, null, 2);
  });

  const compiled = useMemo(() => {
    try { return JSON.parse(resultJson); } catch { return null; }
  }, [resultJson]);

  const onCompile = () => {
    saveSleeveJson(sleeveJson);
    const c = compileFromJson(sleeveJson);
    setResultJson(JSON.stringify(c.result ?? { hasErrors: true, error: c.error }, null, 2));
  };

  const onReset = () => {
    saveSleeveJson(fixture);
    setSleeveJson(fixture);
    const c = compileFromJson(fixture);
    setResultJson(JSON.stringify(c.result ?? { hasErrors: true }, null, 2));
  };

  return (
    <Layout
      top={<TopBar onCompile={onCompile} onReset={onReset} />}
      left={<LeftPanel compiled={compiled} />}
      center={<GraphCanvas compiled={compiled} />}
      right={<RightPanel sleeveJson={sleeveJson} setSleeveJson={setSleeveJson} resultJson={resultJson} />}
    />
  );
}
