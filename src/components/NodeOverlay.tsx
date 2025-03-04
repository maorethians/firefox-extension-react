import React from "react";
import { Commit, Node } from "@/types";
import { isHunkValid } from "@/services/content/isHunkValid.ts";
import { colors } from "@/public/colors.ts";
import { CytoscapeGraph } from "@/components/Graph.tsx";

export const NodeOverlay: React.FC<{
  commit: Commit;
  nodes: Node[];
  excludeSubject?: boolean;
  style?: React.CSSProperties;
}> = ({ commit, nodes, excludeSubject, style }) => {
  if (nodes.length === 0) {
    return;
  }

  if (!isHunkValid(nodes)) {
    return;
  }

  return (
    <div
      style={{
        position: "absolute",
        backgroundColor: colors.APP,
        zIndex: 9999,
        whiteSpace: "nowrap",
        ...(style ?? {}),
      }}
    >
      {nodes.map((node, index) => (
        <CytoscapeGraph
          key={index}
          commit={commit}
          excludeSubject={excludeSubject}
          subjectNode={node}
        />
      ))}
    </div>
  );
};
