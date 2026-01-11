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
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
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
    setSelectedBlockIds([]);
  };

  const handleAddBlock = useCallback((stackId: string, moltType: string) => {
    const result = addBlockToStack(sleeveJson, stackId, { moltType });
    if (result.nextJson) {
      setSleeveJson(result.nextJson);
    }
  }, [sleeveJson]);

  const toggleMultiSelect = useCallback((id: string) => {
    setSelectedBlockIds(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  }, []);

  const clearMultiSelect = useCallback(() => {
    setSelectedBlockIds([]);
  }, []);

  const toggleSelectMode = useCallback(() => {
    setSelectMode(prev => !prev);
  }, []);

  return (
    <Layout
      top={
        <TopBar 
          onCompile={onCompile} 
          onReset={onReset} 
          selectedBlockId={selectedBlockId}
          isDirty={isDirty}
          blockFoundInSleeve={blockFoundInSleeve}
          selectMode={selectMode}
          onToggleSelectMode={toggleSelectMode}
          multiSelectCount={selectedBlockIds.length}
          onClearMultiSelect={clearMultiSelect}
        />
      }
      left={
        <LeftPanel 
          compiled={compiled}
          sleeveJson={sleeveJson}
          selectedTag={selectedTag}
          selectedBlockId={selectedBlockId}
          selectedBlockIds={selectedBlockIds}
          onSelectTag={setSelectedTag}
          onChangeSleeveJson={setSleeveJson}
          onClearMultiSelect={clearMultiSelect}
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
          selectedBlockIds={selectedBlockIds}
          onToggleMultiSelect={toggleMultiSelect}
          selectMode={selectMode}
        />
      }
      right={
        <RightPanel 
          sleeveJson={sleeveJson} 
          setSleeveJson={setSleeveJson} 
          resultJson={resultJson} 
          selectedBlockId={selectedBlockId}
          onSelectBlockId={setSelectedBlockId}
        />
      }
    />
  );
}
