import React from "react";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { isAggregator, isHunk } from "@/types";
import { useColorMode } from "@/services/content/useColorMode.ts";
import { colors } from "@/public/colors.ts";
import {
  darkTheme,
  GraphCanvas,
  GraphEdge,
  GraphNode,
  lightTheme,
} from "reagraph";
import { nanoid } from "nanoid";
import { useSubjectId } from "@/services/content/useSubjectId.ts";
import { useSubjectHunkId } from "@/services/content/useSubjectHunkId.ts";

export const Navigator: React.FC<{
  nodesStore: NodesStore;
}> = ({ nodesStore }) => {
  const colorMode = useColorMode((state) => state.colorMode);
  const color = colors.HUNK.AGGREGATOR[colorMode === "DARK" ? "LIGHT" : "DARK"];

  const subjectId = useSubjectId((state) => state.subjectId);
  const setSubjectId = useSubjectId((state) => state.setSubjectId);
  const subjectHunkId = useSubjectHunkId((state) => state.hunkId);
  const setSubjectHunkId = useSubjectHunkId((state) => state.setHunkId);

  const { node: subjectNode } = nodesStore.getNodeById(
    subjectHunkId ?? subjectId,
  );

  const children = nodesStore
    .getNodes()
    .filter(
      ({ node }) =>
        node.aggregatorIds.includes(subjectNode.id) && isAggregator(node),
    );

  const parents = nodesStore
    .getNodes()
    .filter(({ node }) => subjectNode.aggregatorIds.includes(node.id));

  const graphNodes: GraphNode[] = [];
  const graphEdges: GraphEdge[] = [];

  graphNodes.push({
    id: subjectNode.id,
    labelVisible: false,
    fill: color,
  });

  parents.forEach((parent) => {
    graphNodes.push({
      id: parent.node.id,
      label: parent.node.title ?? parent.node.id,
    });
    graphEdges.push({
      id: nanoid(),
      source: parent.node.id,
      target: subjectNode.id,
    });
  });

  children.forEach((child) => {
    graphNodes.push({
      id: child.node.id,
      label: child.node.title ?? child.node.id,
    });
    graphEdges.push({
      id: nanoid(),
      source: subjectNode.id,
      target: child.node.id,
    });
  });

  return (
    <div
      style={{
        position: "relative",
        width: `350px`,
        height: `250px`,
        overflow: "hidden",
        color,
      }}
    >
      <GraphCanvas
        nodes={graphNodes}
        edges={graphEdges}
        layoutType={"treeTd2d"}
        theme={colorMode === "DARK" ? darkTheme : lightTheme}
        minDistance={13}
        maxDistance={650}
        onNodeClick={({ id }) => {
          const { node } = nodesStore.getNodeById(id);
          if (isHunk(node)) {
            return;
          }

          setSubjectHunkId(null);

          setSubjectId(node.id);
        }}
      />
    </div>
  );
};
