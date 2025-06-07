import { EdgeJson, Hierarchy, UnifiedNodeJson } from "@/types";
import { SingularPattern } from "@/services/content/graph/SingularPattern.ts";
import { UsagePattern } from "@/services/content/graph/UsagePattern.ts";
import { SuccessivePattern } from "@/services/content/graph/SuccessivePattern.ts";
import { TraversalComponent } from "@/services/content/graph/TraversalComponent.ts";
import { BaseNode } from "@/services/content/graph/BaseNode.ts";
import { Hunk } from "@/services/content/graph/Hunk.ts";
import React from "react";
import { StorageKey } from "@/services/StorageKey.ts";
import { UrlHelper } from "@/services/UrlHelper.ts";

export class NodesStore {
  private readonly url: string;
  private nodes: Record<string, BaseNode> = {};
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
}
