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
  | CommitJson["nodeType"];

export type HunkJson = BaseNodeJson & {
  hunkId: string;
  path: string;
  content: string;
  srcs: string[];
  startLine: number;
  endLine: number;
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

const aggregatorNodeTypes = [
  "SUCCESSIVE",
  "USAGE",
  "COMPONENT",
  "SINGULAR",
  "CLUSTER",
  "COMMIT",
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

export type CommitJson = BaseNodeJson & {
  nodeType: "COMMIT";
};

export type AggregatorJson =
  | SuccessivePatternJson
  | UsagePatternJson
  | TraversalComponentJson
  | SingularPatternJson
  | ClusterJson
  | CommitJson;

export type UnifiedNodeJson = HunkJson | AggregatorJson;

export interface Commit {
  url: string;
  nodes: UnifiedNodeJson[];
  edges: EdgeJson[];
}
