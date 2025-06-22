import React from "react";
import { intersection, uniq } from "lodash";
import { Button } from "@mui/material";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { isAggregator, isHunk } from "@/types";
import { useColorMode } from "@/services/content/useColorMode.ts";
import { colors } from "@/public/colors.ts";
import { useSubjectId } from "@/services/content/useSubjectId.ts";
import { Generation } from "@/components/content/Generation.tsx";

export const Navigator: React.FC<{
  nodeIds: string[];
  nodesStore: NodesStore;
}> = ({ nodeIds, nodesStore }) => {
  const children = nodesStore
    .getNodes()
    .filter(
      ({ node }) =>
        intersection(nodeIds, node.aggregatorIds).length > 0 &&
        isAggregator(node),
    );

  const nodes = nodeIds.map((id) => nodesStore.getNodeById(id));
  const parentIds = uniq(
    nodes.map(({ node }) => node.aggregatorIds ?? []).flat(),
  );
  const parents = nodesStore
    .getNodes()
    .filter(({ node }) => parentIds.includes(node.id));

  const setSubjectId = useSubjectId((state) => state.setSubjectId);

  const colorMode = useColorMode((state) => state.colorMode);
  const backgroundColor = colors.HUNK.AGGREGATOR[colorMode];
  const color = colors.HUNK.AGGREGATOR[colorMode === "DARK" ? "LIGHT" : "DARK"];

  const canGenerate = nodeIds.every((id) =>
    isHunk(nodesStore.getNodeById(id).node),
  );

  return (
    <div style={{ color }}>
      {canGenerate && (
        <Generation subjectId={nodeIds[0]} nodesStore={nodesStore} />
      )}

      {parents.length > 0 && (
        <div>
          <h3>Parents:</h3>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {parents.map((parent) => (
              <Button
                variant="contained"
                onClick={() => setSubjectId(parent.node.id)}
                sx={{ backgroundColor: backgroundColor, color }}
              >
                {parent.node.title ?? parent.node.id}
              </Button>
            ))}
          </div>
        </div>
      )}
      {children.length > 0 && (
        <div>
          <h3>Explore:</h3>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {children.map((child) => (
              <Button
                variant="contained"
                onClick={() => setSubjectId(child.node.id)}
                sx={{ backgroundColor: backgroundColor, color }}
              >
                {child.node.title ?? child.node.id}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
