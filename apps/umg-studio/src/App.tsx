import React, { useMemo, useState, useRef, useCallback } from "react";
import Layout, { useIsMobile } from "@/components/Layout";
import TopBar from "@/components/TopBar";
import LeftPanel from "@/components/LeftPanel";
import CenterWorkspace from "@/components/CenterWorkspace";
import RightPanel from "@/components/RightPanel";
import { compileFromJson } from "@/lib/compile";
import { loadSleeveJson, saveSleeveJson } from "@/lib/storage";
import { blockExistsInSleeve, addBlockToStack, parseSleeve } from "@/lib/sleeveEdit";
import { applyOpsToSleeveJson, hasOps, ApplyOpsReport } from "@/lib/applyOps";
import { CompressedGroup, createCompressedGroup } from "@/lib/moltCompression";
import { ParsedItem, ParsedNeoBlock, ParsedNeoStack } from "@/lib/promptParse";
import fixture from "@/fixtures/sleeve.minimal.json?raw";

export default function App() {
  const isMobile = useIsMobile();
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);

  const [sleeveJson, setSleeveJson] = useState(() => loadSleeveJson(fixture));
  const [resultJson, setResultJson] = useState<string>(() => {
    const c = compileFromJson(loadSleeveJson(fixture));
    return JSON.stringify(c.result ?? { hasErrors: true, error: c.error }, null, 2);
  });
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [compileMode, setCompileMode] = useState<"raw" | "withOps">("raw");
  const [opsReport, setOpsReport] = useState<ApplyOpsReport | null>(null);
  const lastCompiledJsonRef = useRef<string>(loadSleeveJson(fixture));
  const [compressedGroups, setCompressedGroups] = useState<CompressedGroup[]>([]);
  const [generatedNeoBlocks, setGeneratedNeoBlocks] = useState<ParsedNeoBlock[]>([]);
  const [generatedNeoStacks, setGeneratedNeoStacks] = useState<ParsedNeoStack[]>([]);

  const compiled = useMemo(() => {
    try { return JSON.parse(resultJson); } catch { return null; }
  }, [resultJson]);

  const isDirty = sleeveJson !== lastCompiledJsonRef.current;

  const blockFoundInSleeve = useMemo(() => {
    if (!selectedBlockId) return false;
    return blockExistsInSleeve(sleeveJson, selectedBlockId);
  }, [sleeveJson, selectedBlockId]);

  const sleeveHasOps = useMemo(() => hasOps(sleeveJson), [sleeveJson]);

  const onCompile = () => {
    saveSleeveJson(sleeveJson);
    const c = compileFromJson(sleeveJson);
    setResultJson(JSON.stringify(c.result ?? { hasErrors: true, error: c.error }, null, 2));
    lastCompiledJsonRef.current = sleeveJson;
    setCompileMode("raw");
    setOpsReport({ bundlesApplied: 0, mergesApplied: 0, blocksCreated: 0, blocksRemovedFromStacks: 0, errors: [] });
    setSelectedTag(null);
  };

  const onCompileWithOps = useCallback(() => {
    saveSleeveJson(sleeveJson);
    const applied = applyOpsToSleeveJson(sleeveJson);
    if (applied.error) {
      setResultJson(JSON.stringify({ hasErrors: true, error: applied.error }, null, 2));
      return;
    }
    const derivedJson = applied.nextJson!;
    const c = compileFromJson(derivedJson);
    setResultJson(JSON.stringify(c.result ?? { hasErrors: true, error: c.error }, null, 2));
    lastCompiledJsonRef.current = sleeveJson;
    setCompileMode("withOps");
    setOpsReport(applied.report ?? null);
    setSelectedTag(null);
  }, [sleeveJson]);

  const onImportSleeve = useCallback((json: string) => {
    saveSleeveJson(json);
    setSleeveJson(json);
    const c = compileFromJson(json);
    setResultJson(JSON.stringify(c.result ?? { hasErrors: true }, null, 2));
    lastCompiledJsonRef.current = json;
    setSelectedBlockId(null);
    setSelectedBlockIds([]);
  }, []);

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

  const findStackForBlocks = useCallback((blockIds: string[]): string | null => {
    const { sleeve } = parseSleeve(sleeveJson);
    if (!sleeve) return null;

    for (const stack of sleeve.stacks ?? []) {
      const stackBlockIds = new Set(stack.blockIds ?? []);
      if (blockIds.every(id => stackBlockIds.has(id))) {
        return stack.id;
      }
    }
    return null;
  }, [sleeveJson]);

  const handleCompressSelection = useCallback((mode: "bundle" | "merge") => {
    if (selectedBlockIds.length < 2) return;

    const stackId = findStackForBlocks(selectedBlockIds);
    if (!stackId) {
      console.warn("Selected blocks must be in the same stack");
      return;
    }

    const group = createCompressedGroup(mode, selectedBlockIds, stackId);
    setCompressedGroups(prev => [...prev, group]);
    setSelectedBlockIds([]);
    setSelectMode(false);
  }, [selectedBlockIds, findStackForBlocks]);

  const handleUncompress = useCallback((groupId: string) => {
    setCompressedGroups(prev => prev.filter(g => g.id !== groupId));
  }, []);

  const handleGenerate = useCallback((item: ParsedItem) => {
    if (item.type === "neoblock") {
      setGeneratedNeoBlocks(prev => [...prev, item as ParsedNeoBlock]);
    } else if (item.type === "neostack") {
      const stack = item as ParsedNeoStack;
      const newBlocks: ParsedNeoBlock[] = [];
      for (const containsTitle of stack.contains) {
        const exists = generatedNeoBlocks.some(b => b.title === containsTitle);
        if (!exists) {
          const placeholderId = `nb_${containsTitle.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 20)}_${Math.random().toString(36).slice(2, 6)}`;
          newBlocks.push({
            type: "neoblock",
            id: placeholderId,
            title: containsTitle,
            tags: ["draft"],
            desc: "Auto-created placeholder"
          });
        }
      }
      if (newBlocks.length > 0) {
        setGeneratedNeoBlocks(prev => [...prev, ...newBlocks]);
      }
      setGeneratedNeoStacks(prev => [...prev, stack]);
    }
  }, [generatedNeoBlocks]);

  return (
    <Layout
      isMobile={isMobile}
      leftDrawerOpen={leftDrawerOpen}
      rightDrawerOpen={rightDrawerOpen}
      onCloseLeftDrawer={() => setLeftDrawerOpen(false)}
      onCloseRightDrawer={() => setRightDrawerOpen(false)}
      top={
        <TopBar 
          onCompile={onCompile} 
          onCompileWithOps={onCompileWithOps}
          onReset={onReset} 
          sleeveJson={sleeveJson}
          onImportSleeve={onImportSleeve}
          selectedBlockId={selectedBlockId}
          isDirty={isDirty}
          blockFoundInSleeve={blockFoundInSleeve}
          selectMode={selectMode}
          onToggleSelectMode={toggleSelectMode}
          multiSelectCount={selectedBlockIds.length}
          onClearMultiSelect={clearMultiSelect}
          hasOps={sleeveHasOps}
          isMobile={isMobile}
          onOpenLeftDrawer={() => setLeftDrawerOpen(true)}
          onOpenRightDrawer={() => setRightDrawerOpen(true)}
          onBundleSelection={() => handleCompressSelection("bundle")}
          onMergeSelection={() => handleCompressSelection("merge")}
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
        <CenterWorkspace 
          sleeveJson={sleeveJson}
          compiled={compiled}
          compressedGroups={compressedGroups}
          isMobile={isMobile}
          onGenerate={handleGenerate}
          onChangeSleeveJson={setSleeveJson}
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
