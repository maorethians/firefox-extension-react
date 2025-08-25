import {
  EdgeJson,
  EdgeType,
  Hierarchy,
  isAggregator,
  UnifiedNodeJson,
} from "@/types";
import { SingularPattern } from "@/services/content/graph/SingularPattern.ts";
import { UsagePattern } from "@/services/content/graph/UsagePattern.ts";
import { SuccessivePattern } from "@/services/content/graph/SuccessivePattern.ts";
import { TraversalComponent } from "@/services/content/graph/TraversalComponent.ts";
import { BaseNode } from "@/services/content/graph/BaseNode.ts";
import { Hunk } from "@/services/content/graph/Hunk.ts";
import { StorageKey } from "@/services/StorageKey.ts";
import { Dictionary, groupBy, last, sum } from "lodash";
import { SimilarityPattern } from "@/services/content/graph/SimilarityPattern.ts";

export class NodesStore {
  private readonly url: string;
  private nodes: Record<string, BaseNode> = {};
  private nodesBranches: Record<string, number> = {};
  private readonly edges: EdgeJson[] = [];
  private readonly sourceEdges: Dictionary<EdgeJson[]> = {};
  private readonly targetEdges: Dictionary<EdgeJson[]> = {};
  private readonly typeEdges: Dictionary<EdgeJson[]> = {};

  constructor(url: string, { nodes, edges }: Hierarchy) {
    this.url = url;
    this.edges = edges;

    this.sourceEdges = groupBy(edges, "sourceId");
    this.targetEdges = groupBy(edges, "targetId");
    this.typeEdges = groupBy(edges, "type");

    this.init(nodes);
  }

  private init(nodes: UnifiedNodeJson[]) {
    for (const node of nodes) {
      switch (node.nodeType) {
        case "BASE":
        case "LOCATION_CONTEXT":
        case "SEMANTIC_CONTEXT":
        case "EXTENSION":
          this.nodes[node.id] = new Hunk(node);
          break;
        case "SINGULAR":
          this.nodes[node.id] = new SingularPattern(node);
          break;
        case "USAGE":
          this.nodes[node.id] = new UsagePattern(node);
          break;
        case "SIMILARITY":
          this.nodes[node.id] = new SimilarityPattern(node);
          break;
        case "SUCCESSIVE":
          this.nodes[node.id] = new SuccessivePattern(node);
          break;
        case "COMPONENT":
        case "CLUSTER":
        case "ROOT":
          this.nodes[node.id] = new TraversalComponent(node);
      }
    }

    const stack = [this.getNodeById("root").node.id];
    this.processNodesBranches(stack);
  }

  private processNodesBranches = (stack: string[]) => {
    if (stack.length === 0) {
      return;
    }

    const subjectId = last(stack)!;

    if (this.nodesBranches[subjectId]) {
      return;
    }

    const targetNodes = this.getSourceEdges(subjectId)
      .filter(({ type }) => type === "EXPANSION")
      .map(({ targetId }) => this.getNodeById(targetId))
      .filter(
        ({ node }) =>
          isAggregator(node) &&
          !this.nodesBranches[node.id] &&
          !stack.includes(node.id),
      );

    for (const targetNode of targetNodes) {
      stack.push(targetNode.node.id);
      this.processNodesBranches(stack);
    }

    if (targetNodes.length === 0) {
      this.nodesBranches[subjectId] = 0;
    } else {
      const childrenBranches = sum(
        targetNodes.map(({ node }) => this.nodesBranches[node.id]),
      );
      this.nodesBranches[subjectId] = childrenBranches + targetNodes.length;
    }

    stack.pop();
  };

  getEdges = () => this.edges;

  getSourceEdges = (sourceId: string) => this.sourceEdges[sourceId] ?? [];

  getTargetEdges = (targetId: string) => this.targetEdges[targetId] ?? [];

  getTypeEdges = (type: EdgeType) => this.typeEdges[type] ?? [];

  getNodeBranches(id: string) {
    return this.nodesBranches[id];
  }

  getNodes() {
    return Object.values(this.nodes);
  }

  getNodeById(id: string) {
    return this.nodes[id];
  }

  updateStorage = async () => {
    const hierarchy: Hierarchy = {
      nodes: this.getNodes().map((node) => node.stringify()),
      edges: this.edges,
    };

    await storage.setItem(StorageKey.hierarchy(this.url), hierarchy);
  };
}
