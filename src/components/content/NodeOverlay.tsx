import React from "react";
import { colors } from "@/public/colors.ts";
import { Navigator } from "@/components/content/Navigator.tsx";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { useColorMode } from "@/services/content/useColorMode.ts";

export const NodeOverlay: React.FC<{
  nodesStore: NodesStore;
  nodeIds: string[];
  style?: React.CSSProperties;
}> = ({ nodesStore, nodeIds, style }) => {
  const colorMode = useColorMode((state) => state.colorMode);

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
      <Navigator nodeIds={nodeIds} nodesStore={nodesStore} />
    </div>
  );
};
