import React from "react";
import { colors } from "@/public/colors.ts";
import { Navigator } from "@/components/content/Navigator.tsx";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { useColorMode } from "@/services/content/useColorMode.ts";
import { Generation } from "@/components/content/Generation.tsx";
import { isHunk } from "@/types";

export const NodeOverlay: React.FC<{
  nodesStore: NodesStore;
  nodeIds: string[];
  style?: React.CSSProperties;
}> = ({ nodesStore, nodeIds, style }) => {
  const colorMode = useColorMode((state) => state.colorMode);

  const nodes = nodeIds.map((id) => nodesStore.getNodeById(id));
  const canGenerate = nodes.every(({ node }) => isHunk(node));

  return (
    <div
      style={{
        position: "absolute",
        backgroundColor: colors[colorMode].PRIMARY,
        zIndex: 999,
        whiteSpace: "nowrap",
        maxWidth: "500px",
        maxHeight: "300px",
        overflowY: "auto",
        overflowX: "hidden",
        ...(style ?? {}),
      }}
    >
      {canGenerate && (
        <Generation subjectId={nodeIds[0]} nodesStore={nodesStore} />
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Navigator nodeIds={nodeIds} nodesStore={nodesStore} />
      </div>
    </div>
  );
};
