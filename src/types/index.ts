interface BaseNodeJson {
  id: string;
  aggregatorIds: string[];
  description?: string;
  title?: string;
  nodeType: string;
}

export type NodeType =
  | HunkJson["nodeType"]
  | SuccessivePatternJson["nodeType"]
  | UsagePatternJson["nodeType"]
  | SimilarityPatternJson["nodeType"]
  | TraversalComponentJson["nodeType"]
  | SingularPatternJson["nodeType"]
  | ClusterJson["nodeType"]
  | RootJson["nodeType"];

export type Range = {
  startLine: number;
  startLineOffset: number;
  endLine: number;
  endLineOffset: number;
  length: number;
};

export type HunkJson = BaseNodeJson & {
  path: string;
  content: string;
  promptId?: string;
  identifiers?: string[];
  srcs?: ({
    path: string;
    content: string;
    astType: string;
    promptId?: string;
    contexts: {
      content: string;
      nodeType: NodeType;
    }[];
  } & Range)[];
  dsts?: Range[];
  dstExceptions?: Range[];
  nodeType: "BASE" | "LOCATION_CONTEXT" | "SEMANTIC_CONTEXT" | "EXTENSION";
  astType: string;
} & Range;

export enum EdgeType {
  DEF_USE = "DEF_USE",
  SIMILARITY = "SIMILARITY",
  SUCCESSION = "SUCCESSION",
  CONTEXT = "CONTEXT",
  EXPANSION = "EXPANSION",
}

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

export type SimilarityPatternJson = BaseNodeJson & {
  nodeType: "SIMILARITY";
};

export type ReasonType = "COMMON" | "SIMILAR";

export type TraversalComponentJson = BaseNodeJson & {
  // TODO: id should be enough
  reasons: { id: string; content: string }[];
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
  | SimilarityPatternJson
  | TraversalComponentJson
  | SingularPatternJson
  | ClusterJson
  | RootJson;

export type UnifiedNodeJson = HunkJson | AggregatorJson;

export interface Cluster {
  nodes: HunkJson[];
  edges: EdgeJson[];
}

export interface StorageData {
  nodes: UnifiedNodeJson[];
  edges: EdgeJson[];
  messageStatements?: string[];
}
