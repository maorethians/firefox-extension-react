import React from "react";
import { colors } from "@/public/colors.ts";
import { Navigator } from "@/components/content/Navigator.tsx";
import { NodesStore } from "@/services/content/NodesStore.ts";

export const NodeOverlay: React.FC<{
  nodesStore: NodesStore;
  nodeIds: string[];
  style?: React.CSSProperties;
}> = ({ nodesStore, nodeIds, style }) => {
  return (
    <div
      style={{
        position: "absolute",
        backgroundColor: colors.DARK.PRIMARY,
        zIndex: 999,
        whiteSpace: "nowrap",
        ...(style ?? {}),
      }}
    >
      <Navigator nodeIds={nodeIds} nodesStore={nodesStore} />
    </div>
  );
};
