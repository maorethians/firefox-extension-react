import { colors } from "@/public/colors.ts";
import { NodeType } from "@/types";

export const getNodeColor = (node: { nodeType: NodeType }) => {
  let nodeColor: string;
  switch (node.nodeType) {
    case "SEMANTIC_CONTEXT":
    case "LOCATION_CONTEXT":
      nodeColor = colors.NODE.CONTEXT;
      break;
    case "EXTENSION":
      nodeColor = colors.NODE.EXTENSION;
      break;
    case "COMMIT":
    case "CLUSTER":
    case "COMPONENT":
    case "SUCCESSIVE":
    case "USAGE":
    case "SINGULAR":
      nodeColor = colors.NODE.EXPANSION;
      break;
    default:
      nodeColor = colors.NODE.BASE;
  }

  return nodeColor;
};
