import { EdgeJson, Hierarchy, isAggregator, UnifiedNodeJson } from "@/types";
import { SingularPattern } from "@/services/content/graph/SingularPattern.ts";
import { UsagePattern } from "@/services/content/graph/UsagePattern.ts";
import { SuccessivePattern } from "@/services/content/graph/SuccessivePattern.ts";
import { TraversalComponent } from "@/services/content/graph/TraversalComponent.ts";
import { BaseNode } from "@/services/content/graph/BaseNode.ts";
import { Hunk } from "@/services/content/graph/Hunk.ts";
import React from "react";
import { StorageKey } from "@/services/StorageKey.ts";
import { UrlHelper } from "@/services/UrlHelper.ts";
import { intersection, last, sum } from "lodash";

export class NodesStore {
  private readonly url: string;
  private nodes: Record<string, BaseNode> = {};
  private nodesBranches: Record<string, number> = {};
  private nodeDescendents: Record<
    string,
    { firstGeneration: Hunk[]; extendedGenerations: Hunk[] }
  > = {};
  edges: EdgeJson[] = [];

  constructor(url: string, { nodes, edges }: Hierarchy) {
    this.url = url;
    this.edges = edges;

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

    const targetNodes = this.edges
      .filter(
        ({ type, sourceId }) => type === "EXPANSION" && sourceId === subjectId,
      )
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

  getNodeBranches(id: string) {
    return this.nodesBranches[id];
  }

  getNodes() {
    return Object.values(this.nodes);
  }

  getNodeById(id: string) {
    return this.nodes[id];
  }

  describeNode = async (
    id: string,
    setProcessing: React.Dispatch<React.SetStateAction<boolean>>,
    set: React.Dispatch<React.SetStateAction<string | undefined>>,
    options?: {
      force?: boolean;
      advanced?: boolean;
      entitle?: boolean;
      agent?: boolean;
    },
  ) => {
    const node = this.getNodeById(id);
    await node.describeNode(this, setProcessing, set, options);
  };

  entitleNode = async (
    id: string,
    set: React.Dispatch<React.SetStateAction<string | undefined>>,
    force?: boolean,
  ) => {
    const node = this.getNodeById(id);
    await node.entitle(set, force);
  };

  updateStorage = async () => {
    const hierarchy: Hierarchy = {
      nodes: this.getNodes().map((node) => node.stringify()),
      edges: this.edges,
    };

    await storage.setItem(
      StorageKey.hierarchy(UrlHelper.getId(this.url)),
      hierarchy,
    );
  };

  getDescendantHunks(subjectNode: BaseNode) {
    const subjectId = subjectNode.node.id;

    if (this.nodeDescendents[subjectId]) {
      return this.nodeDescendents[subjectId];
    }

    const firstGeneration: Hunk[] = [];
    const extendedGenerations: Hunk[] = [];

    let hopNodeIds = [subjectNode.node.id];
    while (true) {
      const hopChildrenNodes = this.getNodes().filter(
        ({ node }) => intersection(hopNodeIds, node.aggregatorIds).length > 0,
      );

      if (hopChildrenNodes.length == 0) {
        break;
      }

      const hopChildrenHunks = hopChildrenNodes.filter(
        ({ node }) => node.nodeType === "BASE" || node.nodeType === "EXTENSION",
      ) as Hunk[];
      if (firstGeneration.length === 0) {
        firstGeneration.push(...hopChildrenHunks);
      } else {
        extendedGenerations.push(...hopChildrenHunks);
      }

      hopNodeIds = hopChildrenNodes.map(({ node }) => node.id);
    }

    this.nodeDescendents[subjectId] = { firstGeneration, extendedGenerations };
    return this.nodeDescendents[subjectId];
  }
}
