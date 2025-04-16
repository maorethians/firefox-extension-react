import { RefObject } from "react";
import { Commit, Node } from "@/types";
import cytoscape from "cytoscape";
import CytoscapeComponent from "react-cytoscapejs";
import { keyBy } from "lodash";
import { SUBJECT_MESSAGE_TYPE } from "@/components/SubjectNode.tsx";
import { colors } from "@/public/colors.ts";

export const CytoscapeGraph = ({
  commit,
  subjectNode,
  excludeSubject,
}: {
  commit: Commit;
  subjectNode: Node;
  excludeSubject?: boolean;
}) => {
  const nodes = [];

  if (!excludeSubject) {
    nodes.push(subjectNode);
  }

  const children = commit.nodes.filter(
    (node) => node.aggregatorIds && node.aggregatorIds.includes(subjectNode.id),
  );
  nodes.push(...children);

  const commitNodesDictionary = keyBy(commit.nodes, "id");
  const parents =
    subjectNode.aggregatorIds &&
    subjectNode.aggregatorIds.map(
      (aggregatorId) => commitNodesDictionary[aggregatorId],
    );
  if (parents) {
    nodes.push(...parents);
  }

  const cyRef: RefObject<cytoscape.Core | null> = useRef(null);

  useEffect(() => {}, [commit, subjectNode]);

  useEffect(() => {
    const cy = cyRef.current;
    if (cy) {
      cy.on("tap", "node", (event) => {
        const clickedNode = event.target;
        const { id: nodeId } = clickedNode.data();
        const id = nodeId.endsWith("-parent") ? nodeId.slice(0, -7) : nodeId;
        window.postMessage({
          type: SUBJECT_MESSAGE_TYPE,
          data: { subjectId: id },
        });
      });
    }
  }, []);

  const graphNodes: cytoscape.CytoscapeOptions["elements"] = [];
  nodes.forEach((node) => {
    // if (!node.isAggregator) {
    //   return;
    // }

    let nodeColor: string;
    switch (node.nodeType) {
      case "CONTEXT":
        nodeColor = colors.HUNK.CONTEXT;
        break;
      case "EXTENSION":
        nodeColor = colors.HUNK.EXTENSION;
        break;
      default:
        nodeColor = colors.HUNK.BASE;
    }

    graphNodes.push({
      data: {
        id: `${node.id}-parent`,
        content: node.id,
        backgroundColor: nodeColor,
        isAggregator: node.nodeType === "AGGREGATOR",
        aggregatorIds: node.aggregatorIds,
      },
    });
    graphNodes.push({
      data: {
        id: node.id,
        content: node.textualRepresentation,
        parent: `${node.id}-parent`,
        backgroundColor: nodeColor,
        isAggregator: node.nodeType === "AGGREGATOR",
        aggregatorIds: node.aggregatorIds,
      },
    });
  });

  const graphNodeIds = graphNodes.map((node) => node.data.id!);
  const { edges } = commit;
  const elements: cytoscape.CytoscapeOptions["elements"] = [
    ...graphNodes,
    ...edges
      .filter((edge) => edge.weight > 0.5)
      .filter((edge) => {
        const { sourceId, targetId } = edge;
        return (
          graphNodeIds.includes(sourceId) && graphNodeIds.includes(targetId)
        );
      })
      .map((edge) => {
        let label = "";
        if (edge.type == "SIMILARITY") {
          label += edge.weight;
        }

        return {
          data: {
            source: edge.sourceId,
            target: edge.targetId,
            label,
            color: colors.EDGE[edge.type] ?? "white",
          },
        };
      }),
  ];

  return (
    <CytoscapeComponent
      elements={elements}
      layout={{
        name: "cose",
        nodeDimensionsIncludeLabels: true,
        componentSpacing: 500,
        nodeRepulsion: () => 50000,
        edgeElasticity: () => 5000,
        // nodeOverlap: 0,
        // idealEdgeLength: 32,
      }}
      style={{ width: "400px", height: "400px" }}
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
      cy={(cy: cytoscape.Core) => (cyRef.current = cy)}
    />
  );
};
