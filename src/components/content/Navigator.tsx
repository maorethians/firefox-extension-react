import React from "react";
import { intersection, uniq } from "lodash";
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

export const Navigator: React.FC<{
  nodeIds: string[];
  nodesStore: NodesStore;
}> = ({ nodeIds, nodesStore }) => {
  const setSubjectId = useSubjectId((state) => state.setSubjectId);

  const colorMode = useColorMode((state) => state.colorMode);
  const color = colors.HUNK.AGGREGATOR[colorMode === "DARK" ? "LIGHT" : "DARK"];

  const nodes = nodeIds.map((id) => nodesStore.getNodeById(id));

  const children = nodesStore
    .getNodes()
    .filter(
      ({ node }) =>
        intersection(nodeIds, node.aggregatorIds).length > 0 &&
        isAggregator(node),
    );

  const parentIds = uniq(
    nodes.map(({ node }) => node.aggregatorIds ?? []).flat(),
  );
  const parents = nodesStore
    .getNodes()
    .filter(({ node }) => parentIds.includes(node.id));

  const graphNodes: GraphNode[] = [];
  const graphEdges: GraphEdge[] = [];

  const subject = nodes[0];
  graphNodes.push({
    id: subject.node.id,
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
      target: subject.node.id,
    });
  });

  children.forEach((child) => {
    graphNodes.push({
      id: child.node.id,
      label: child.node.title ?? child.node.id,
    });
    graphEdges.push({
      id: nanoid(),
      source: subject.node.id,
      target: child.node.id,
    });
  });

  return (
    <div
      style={{
        position: "relative",
        width: `150px`,
        height: `150px`,
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

          setSubjectId(node.id);
        }}
      />
    </div>
  );
};
