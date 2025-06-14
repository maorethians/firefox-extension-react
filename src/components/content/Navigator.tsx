import React from "react";
import { intersection, uniq } from "lodash";
import { Button } from "@mui/material";
import { SUBJECT_MESSAGE_TYPE } from "@/components/content/SubjectNode.tsx";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { isAggregator } from "@/types";
import { useColorMode } from "@/services/content/useColorMode.ts";
import { colors } from "@/public/colors.ts";

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

  const colorMode = useColorMode((state) => state.colorMode);
  const backgroundColor = colors.HUNK.AGGREGATOR[colorMode];
  const color = colors.HUNK.AGGREGATOR[colorMode === "DARK" ? "LIGHT" : "DARK"];

  return (
    <div style={{ color }}>
      {parents.length > 0 && (
        <div>
          <h3>Parents:</h3>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {parents.map((parent) => (
              <Button
                variant="contained"
                onClick={() => {
                  window.postMessage({
                    type: SUBJECT_MESSAGE_TYPE,
                    data: { subjectId: parent.node.id },
                  });
                }}
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
                onClick={() => {
                  window.postMessage({
                    type: SUBJECT_MESSAGE_TYPE,
                    data: { subjectId: child.node.id },
                  });
                }}
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
