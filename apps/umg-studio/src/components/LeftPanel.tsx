import React from "react";
import TagExplorer from "./TagExplorer";

interface LeftPanelProps {
  compiled: any;
  selectedTag?: string | null;
  onSelectTag?: (tag: string | null) => void;
}

export default function LeftPanel({ compiled, selectedTag, onSelectTag }: LeftPanelProps) {
  const indexes = compiled?.runtime?.indexes;
  const tags = indexes?.tags;

  return (
    <div>
      <h3 style={{ margin: "0 0 12px", fontSize: 13, opacity: 0.7 }}>Tag Explorer</h3>
      {selectedTag && (
        <div 
          style={{ 
            marginBottom: 12, 
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
    </div>
  );
}
