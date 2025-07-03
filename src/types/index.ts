interface BaseNodeJson {
  id: string;
  aggregatorIds: string[];
  description?: string;
  title?: string;
  chat?: string[];
  nodeType: string;
}

export type NodeType =
  | HunkJson["nodeType"]
  | SuccessivePatternJson["nodeType"]
  | UsagePatternJson["nodeType"]
  | TraversalComponentJson["nodeType"]
  | SingularPatternJson["nodeType"]
  | ClusterJson["nodeType"]
  | RootJson["nodeType"];

export type HunkJson = BaseNodeJson & {
  hunkId: string;
  path: string;
  content: string;
  srcs?: string[];
  dsts?: {
    startLine: number;
    startLineOffset: number;
    endLine: number;
    endLineOffset: number;
  }[];
  startLine: number;
  startLineOffset: number;
  endLine: number;
  endLineOffset: number;
  nodeType: "BASE" | "LOCATION_CONTEXT" | "SEMANTIC_CONTEXT" | "EXTENSION";
};

export type EdgeType =
  | "DEF_USE"
  | "SIMILARITY"
  | "SUCCESSION"
  | "CONTEXT"
  | "EXPANSION";

export interface EdgeJson {
  sourceId: string;
  targetId: string;
  type: EdgeType;
}

export const aggregatorNodeTypes = [
  "SUCCESSIVE",
  "USAGE",
  "COMPONENT",
  "SINGULAR",
  "CLUSTER",
  "ROOT",
];

export const isAggregator = (node: BaseNodeJson): node is AggregatorJson => {
  return aggregatorNodeTypes.includes(node.nodeType);
};

export const isHunk = (node: BaseNodeJson): node is HunkJson => {
  return !isAggregator(node);
};

export type SuccessivePatternJson = BaseNodeJson & {
  headId: string;
  nodeType: "SUCCESSIVE";
};

export type UsagePatternJson = BaseNodeJson & {
  nodeType: "USAGE";
};

export type ReasonType = "COMMON" | "SIMILAR";

export type TraversalComponentJson = BaseNodeJson & {
  reasons: string[];
  reasonType: ReasonType;
  nodeType: "COMPONENT";
};

export type SingularPatternJson = BaseNodeJson & {
  nodeType: "SINGULAR";
};

export type ClusterJson = BaseNodeJson & {
  nodeType: "CLUSTER";
};

export type RootJson = BaseNodeJson & {
  nodeType: "ROOT";
};

export type AggregatorJson =
  | SuccessivePatternJson
  | UsagePatternJson
  | TraversalComponentJson
  | SingularPatternJson
  | ClusterJson
  | RootJson;

export type UnifiedNodeJson = HunkJson | AggregatorJson;

export interface Cluster {
  nodes: HunkJson[];
  edges: EdgeJson[];
}

export interface Hierarchy {
  nodes: UnifiedNodeJson[];
  edges: EdgeJson[];
}
