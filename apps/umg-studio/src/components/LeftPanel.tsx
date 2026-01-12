import React, { useState, useEffect } from "react";
import TagExplorer from "./TagExplorer";
import LibraryPanel from "./LibraryPanel";
import StructurePanel from "./StructurePanel";
import { loadSidebarState, saveSidebarState, SidebarState } from "@/lib/sidebarState";

interface SectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({ title, isOpen, onToggle, children }: SectionProps) {
  return (
    <div style={{ marginBottom: 8 }}>
      <button
        onClick={onToggle}
        data-testid={`section-toggle-${title.toLowerCase().replace(/\s+/g, "-")}`}
        style={{
          width: "100%",
          padding: "8px 10px",
          background: "rgba(255,255,255,0.03)",
          border: "none",
          borderRadius: 4,
          color: "inherit",
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <span>{title}</span>
        <span style={{ opacity: 0.5 }}>{isOpen ? "−" : "+"}</span>
      </button>
      {isOpen && (
        <div style={{ padding: "10px 8px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

interface LeftPanelProps {
  compiled: any;
  sleeveJson: string;
  selectedTag?: string | null;
  selectedBlockId?: string | null;
  selectedBlockIds?: string[];
  onSelectTag?: (tag: string | null) => void;
  onChangeSleeveJson: (next: string) => void;
  onClearMultiSelect?: () => void;
}

export default function LeftPanel({ 
  compiled, 
  sleeveJson, 
  selectedTag, 
  selectedBlockId, 
  selectedBlockIds = [],
  onSelectTag, 
  onChangeSleeveJson,
  onClearMultiSelect 
}: LeftPanelProps) {
  const [sections, setSections] = useState<SidebarState>(() => loadSidebarState());

  useEffect(() => {
    setSections(loadSidebarState());
  }, []);

  const handleToggle = (section: keyof SidebarState) => {
    setSections(prev => {
      const next = { ...prev, [section]: !prev[section] };
      saveSidebarState(next);
      return next;
    });
  };

  const indexes = compiled?.runtime?.indexes;
  const tags = indexes?.tags;

  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <div style={{ padding: "12px 8px 8px", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>UMG Studio</div>
        <div className="small" style={{ opacity: 0.5, marginTop: 2 }}>Sidebar</div>
      </div>

      <CollapsibleSection 
        title="Template" 
        isOpen={sections.template}
        onToggle={() => handleToggle("template")}
      >
        <div style={{ fontSize: 11, opacity: 0.6 }}>
          <p style={{ marginBottom: 8 }}>Template settings and presets for quick sleeve creation.</p>
          <div style={{
            padding: 8,
            background: "rgba(255,255,255,0.03)",
            borderRadius: 4,
            fontSize: 10
          }}>
            No templates loaded. Use the PROMPT tab in the bottom panel to create NeoBlocks and NeoStacks.
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection 
        title="Block Library" 
        isOpen={sections.library}
        onToggle={() => handleToggle("library")}
      >
        <LibraryPanel 
          sleeveJson={sleeveJson} 
          selectedBlockId={selectedBlockId ?? null}
          onChangeSleeveJson={onChangeSleeveJson}
        />
      </CollapsibleSection>

      <CollapsibleSection 
        title="Tags" 
        isOpen={sections.tags}
        onToggle={() => handleToggle("tags")}
      >
        {selectedTag && (
          <div 
            style={{ 
              marginBottom: 10, 
              padding: "6px 10px", 
              background: "rgba(255,105,180,0.1)",
              borderRadius: 6,
              fontSize: 11
            }}
          >
            Filtering: <span className="hotpink" style={{ fontWeight: 600 }}>{selectedTag}</span>
            <span 
              onClick={() => onSelectTag?.(null)}
              style={{ 
                marginLeft: 8, 
                cursor: "pointer", 
                opacity: 0.7,
                textDecoration: "underline"
              }}
            >
              clear
            </span>
          </div>
        )}
        {tags ? (
          <TagExplorer 
            tags={tags} 
            selectedTag={selectedTag}
            onSelectTag={onSelectTag}
          />
        ) : (
          <p className="small" style={{ opacity: 0.5 }}>Compile to see tags</p>
        )}
      </CollapsibleSection>

      <CollapsibleSection 
        title="Structure" 
        isOpen={sections.structure}
        onToggle={() => handleToggle("structure")}
      >
        <StructurePanel 
          sleeveJson={sleeveJson}
          onChangeSleeveJson={onChangeSleeveJson}
          selectedBlockIds={selectedBlockIds}
          onClearMultiSelect={onClearMultiSelect}
        />
      </CollapsibleSection>
    </div>
  );
}
