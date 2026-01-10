import React from "react";

interface TagExplorerProps {
  tags: {
    allTagsSorted?: string[];
    blockIdsByTag?: Record<string, string[]>;
  };
}

export default function TagExplorer({ tags }: TagExplorerProps) {
  const allTags = tags.allTagsSorted ?? [];
  const blockIdsByTag = tags.blockIdsByTag ?? {};

  if (allTags.length === 0) {
    return <p className="small" style={{ opacity: 0.5 }}>No tags found</p>;
  }

  return (
    <div>
      {allTags.map((tag) => (
        <div key={tag} style={{ marginBottom: 12 }}>
          <div className="hotpink" style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
            {tag}
          </div>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {(blockIdsByTag[tag] ?? []).map((blockId) => (
              <li key={blockId} className="mono small">{blockId}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
