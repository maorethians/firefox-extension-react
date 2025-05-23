"use client";

import cytoscape from "cytoscape";
import React, { RefObject, useRef, useState } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import {
  aggregatorNodeTypes,
  EdgeJson,
  Graph as GraphType,
  HunkJson,
  UnifiedNodeJson,
} from "@/types";
import { colors } from "@/public/colors.ts";

export const CLUSTER_MESSAGE = "SetCluster";

export const Graph: React.FC<{ clusters: GraphType[] }> = ({ clusters }) => {
  const cyRef: RefObject<cytoscape.Core | null> = useRef(null);

  const [nodes, setNodes] = useState([] as UnifiedNodeJson[]);
  const [edges, setEdges] = useState([] as EdgeJson[]);

  window.addEventListener("message", ({ data }: MessageEvent) => {
    if (data.type !== CLUSTER_MESSAGE) {
      return;
    }

    const { clusterIndex } = data.data;
    const cluster = clusters[clusterIndex];

    setNodes(cluster.nodes);
    setEdges(cluster.edges);
  });

  const graphNodes: cytoscape.CytoscapeOptions["elements"] = [];
  nodes.forEach((node) => {
    let nodeColor: string;
    switch (node.nodeType) {
      case "SEMANTIC_CONTEXT":
      case "LOCATION_CONTEXT":
        nodeColor = colors.NODE.CONTEXT;
        break;
      case "EXTENSION":
        nodeColor = colors.NODE.EXTENSION;
        break;
      default:
        nodeColor = colors.NODE.BASE;
    }

    graphNodes.push({
      data: {
        id: `${node.id}-parent`,
        content: node.id,
        backgroundColor: nodeColor,
        isAggregator: aggregatorNodeTypes.includes(node.nodeType),
        aggregatorIds: node.aggregatorIds,
      },
    });
    graphNodes.push({
      data: {
        id: node.id,
        content: [(node as HunkJson).content].join("\n\n---\n\n"),
        parent: `${node.id}-parent`,
        backgroundColor: nodeColor,
        isAggregator: aggregatorNodeTypes.includes(node.nodeType),
        aggregatorIds: node.aggregatorIds,
      },
    });
  });

  const graphEdges: cytoscape.CytoscapeOptions["elements"] = [];
  const graphNodeIds = graphNodes.map((node) => node.data.id!);
  edges.forEach((edge) => {
    const { sourceId, targetId } = edge;
    if (!graphNodeIds.includes(sourceId) || !graphNodeIds.includes(targetId)) {
      return;
    }

    graphEdges.push({
      data: {
        source: sourceId,
        target: targetId,
        color: colors.EDGE[edge.type],
      },
    });
  });

  return (
    <CytoscapeComponent
      elements={[...graphNodes, ...graphEdges]}
      layout={{
        name: "cose",
        nodeDimensionsIncludeLabels: true,
        componentSpacing: 500,
        nodeRepulsion: () => 500000000,
        edgeElasticity: () => 5000,
        // nodeOverlap: 0,
        // idealEdgeLength: 32,
      }}
      style={{ width: "100%", height: "1000px" }}
      stylesheet={[
        {
          selector: "node",
          style: {
            "background-color": "data(backgroundColor)",
            label: "data(content)",
            "text-justification": "left",
            color: "white",
            "font-size": "5px",
            shape: "rectangle",
            "text-wrap": "wrap", // Enables text wrapping
            "text-max-width": "300px", // Maximum width before wrapping
          },
        },
        {
          selector: "edge",
          style: {
            width: 3,
            "line-color": "data(color)",
            "target-arrow-color": "data(color)",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(label)",
            color: "white",
            "font-size": "3px",
            opacity: 0.5,
          },
        },
      ]}
      cy={(cy) => (cyRef.current = cy)}
    />
  );
};
