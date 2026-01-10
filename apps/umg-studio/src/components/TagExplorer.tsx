import React from "react";

interface TagExplorerProps {
  tags: {
    allTagsSorted?: string[];
    blockIdsByTag?: Record<string, string[]>;
  };
  selectedTag?: string | null;
  onSelectTag?: (tag: string | null) => void;
}

export default function TagExplorer({ tags, selectedTag, onSelectTag }: TagExplorerProps) {
  const allTags = tags.allTagsSorted ?? [];
  const blockIdsByTag = tags.blockIdsByTag ?? {};

  if (allTags.length === 0) {
    return <p className="small" style={{ opacity: 0.5 }}>No tags found</p>;
  }

  const handleTagClick = (tag: string) => {
    if (onSelectTag) {
      onSelectTag(selectedTag === tag ? null : tag);
    }
  };

  return (
    <div>
      {allTags.map((tag) => {
        const count = (blockIdsByTag[tag] ?? []).length;
        const isSelected = selectedTag === tag;

        return (
          <div 
            key={tag} 
            onClick={() => handleTagClick(tag)}
            style={{ 
              marginBottom: 8,
              padding: "8px 10px",
              background: isSelected ? "rgba(255,105,180,0.15)" : "rgba(255,255,255,0.03)",
              borderRadius: 6,
              border: isSelected ? "1px solid #ff69b4" : "1px solid transparent",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center" 
            }}>
              <span 
                className="hotpink" 
                style={{ 
                  fontWeight: 600, 
                  fontSize: 13,
                  opacity: isSelected ? 1 : 0.9
                }}
              >
                {tag}
              </span>
              <span 
                style={{ 
                  fontSize: 11, 
                  padding: "2px 8px",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  opacity: 0.7
                }}
              >
                {count}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
