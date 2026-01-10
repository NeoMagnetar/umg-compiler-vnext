import React from "react";
import TagExplorer from "./TagExplorer";

interface LeftPanelProps {
  compiled: any;
}

export default function LeftPanel({ compiled }: LeftPanelProps) {
  const indexes = compiled?.runtime?.indexes;
  const tags = indexes?.tags;

  return (
    <div>
      <h3 style={{ margin: "0 0 12px", fontSize: 13, opacity: 0.7 }}>Tag Explorer</h3>
      {tags ? (
        <TagExplorer tags={tags} />
      ) : (
        <p className="small" style={{ opacity: 0.5 }}>Compile to see tags</p>
      )}
    </div>
  );
}
