import React, { useState } from "react";
import TagExplorer from "./TagExplorer";
import LibraryPanel from "./LibraryPanel";
import StructurePanel from "./StructurePanel";

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, defaultOpen = true, children }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div style={{ marginBottom: 8 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
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
  onSelectTag?: (tag: string | null) => void;
  onChangeSleeveJson: (next: string) => void;
}

export default function LeftPanel({ compiled, sleeveJson, selectedTag, selectedBlockId, onSelectTag, onChangeSleeveJson }: LeftPanelProps) {
  const indexes = compiled?.runtime?.indexes;
  const tags = indexes?.tags;

  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <div style={{ padding: "12px 8px 8px", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>UMG Studio</div>
        <div className="small" style={{ opacity: 0.5, marginTop: 2 }}>Sidebar</div>
      </div>

      <CollapsibleSection title="Library" defaultOpen={false}>
        <LibraryPanel 
          sleeveJson={sleeveJson} 
          selectedBlockId={selectedBlockId ?? null}
          onChangeSleeveJson={onChangeSleeveJson}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Tags" defaultOpen={true}>
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

      <CollapsibleSection title="Structure" defaultOpen={true}>
        <StructurePanel 
          sleeveJson={sleeveJson}
          onChangeSleeveJson={onChangeSleeveJson}
        />
      </CollapsibleSection>
    </div>
  );
}
