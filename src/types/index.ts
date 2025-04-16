export interface Node {
  id: string;
  hunkId: string;
  file: string;
  textualRepresentation: string;
  description?: string;
  title?: string;
  startLine: number;
  startChar: number;
  endLine: number;
  endChar: number;
  nodeType: "BASE" | "CONTEXT" | "AGGREGATOR" | "EXTENSION";
  aggregatorIds?: string[];
}

export interface Edge {
  sourceId: string;
  targetId: string;
  type: "DEF_USE" | "SIMILARITY" | "SUCCESSION" | "CONTEXT" | "EXPANSION";
  weight: number;
}

export interface Commit {
  url: string;
  nodes: Node[];
  edges: Edge[];
}
