import React, { useMemo, useState, useRef, useCallback } from "react";
import Layout from "@/components/Layout";
import TopBar from "@/components/TopBar";
import LeftPanel from "@/components/LeftPanel";
import GraphCanvas from "@/components/GraphCanvas";
import RightPanel from "@/components/RightPanel";
import { compileFromJson } from "@/lib/compile";
import { loadSleeveJson, saveSleeveJson } from "@/lib/storage";
import { blockExistsInSleeve, addBlockToStack } from "@/lib/sleeveEdit";
import fixture from "@/fixtures/sleeve.minimal.json?raw";

export default function App() {
  const [sleeveJson, setSleeveJson] = useState(() => loadSleeveJson(fixture));
  const [resultJson, setResultJson] = useState<string>(() => {
    const c = compileFromJson(loadSleeveJson(fixture));
    return JSON.stringify(c.result ?? { hasErrors: true, error: c.error }, null, 2);
  });
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const lastCompiledJsonRef = useRef<string>(loadSleeveJson(fixture));

  const compiled = useMemo(() => {
    try { return JSON.parse(resultJson); } catch { return null; }
  }, [resultJson]);

  const isDirty = sleeveJson !== lastCompiledJsonRef.current;

  const blockFoundInSleeve = useMemo(() => {
    if (!selectedBlockId) return false;
    return blockExistsInSleeve(sleeveJson, selectedBlockId);
  }, [sleeveJson, selectedBlockId]);

  const onCompile = () => {
    saveSleeveJson(sleeveJson);
    const c = compileFromJson(sleeveJson);
    setResultJson(JSON.stringify(c.result ?? { hasErrors: true, error: c.error }, null, 2));
    lastCompiledJsonRef.current = sleeveJson;
    setSelectedTag(null);
  };

  const onReset = () => {
    saveSleeveJson(fixture);
    setSleeveJson(fixture);
    const c = compileFromJson(fixture);
    setResultJson(JSON.stringify(c.result ?? { hasErrors: true }, null, 2));
    lastCompiledJsonRef.current = fixture;
    setSelectedTag(null);
    setSelectedBlockId(null);
  };

  const handleAddBlock = useCallback((stackId: string, moltType: string) => {
    const result = addBlockToStack(sleeveJson, stackId, { moltType });
    if (result.nextJson) {
      setSleeveJson(result.nextJson);
    }
  }, [sleeveJson]);

  return (
    <Layout
      top={
        <TopBar 
          onCompile={onCompile} 
          onReset={onReset} 
          selectedBlockId={selectedBlockId}
          isDirty={isDirty}
          blockFoundInSleeve={blockFoundInSleeve}
        />
      }
      left={
        <LeftPanel 
          compiled={compiled}
          sleeveJson={sleeveJson}
          selectedTag={selectedTag}
          selectedBlockId={selectedBlockId}
          onSelectTag={setSelectedTag}
          onChangeSleeveJson={setSleeveJson}
        />
      }
      center={
        <GraphCanvas 
          sleeveJson={sleeveJson}
          compiled={compiled} 
          selectedTag={selectedTag} 
          selectedBlockId={selectedBlockId}
          onSelectBlockId={setSelectedBlockId}
          onAddBlock={handleAddBlock}
        />
      }
      right={
        <RightPanel 
          sleeveJson={sleeveJson} 
          setSleeveJson={setSleeveJson} 
          resultJson={resultJson} 
          selectedBlockId={selectedBlockId}
        />
      }
    />
  );
}
