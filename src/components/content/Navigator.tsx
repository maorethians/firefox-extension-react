import React from "react";
import { intersection, uniq } from "lodash";
import { Button } from "@mui/material";
import { SUBJECT_MESSAGE_TYPE } from "@/components/content/SubjectNode.tsx";
import { NodesStore } from "@/services/content/NodesStore.ts";

export const Navigator: React.FC<{
  nodeIds: string[];
  nodesStore: NodesStore;
}> = ({ nodeIds, nodesStore }) => {
  const children = nodesStore
    .getNodes()
    .filter(
      ({ node }) =>
        intersection(nodeIds, node.aggregatorIds).length > 0 &&
        node.nodeType !== "CONTEXT",
    );

  const nodes = nodeIds.map((id) => nodesStore.getNodeById(id));
  const parentIds = uniq(
    nodes.map(({ node }) => node.aggregatorIds ?? []).flat(),
  );
  const parents = nodesStore
    .getNodes()
    .filter(({ node }) => parentIds.includes(node.id));

  return (
    <div>
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
