import { Commit, EdgeJson, Graph } from "@/types";
import { SingularPattern } from "@/services/content/graph/SingularPattern.ts";
import { UsagePattern } from "@/services/content/graph/UsagePattern.ts";
import { SuccessivePattern } from "@/services/content/graph/SuccessivePattern.ts";
import { TraversalComponent } from "@/services/content/graph/TraversalComponent.ts";
import { BaseNode } from "@/services/content/graph/BaseNode.ts";
import { Hunk } from "@/services/content/graph/Hunk.ts";
import React from "react";
import { StorageKey } from "@/services/StorageKey.ts";

export class NodesStore {
  url = "";
  private nodes: Record<string, BaseNode> = {};
  edges: EdgeJson[] = [];
  clusters: Graph[] = [];

  constructor(commit: Commit) {
    this.init(commit);
  }

  private init(commit: Commit) {
    this.url = commit.url;
    this.edges = commit.edges;
    this.clusters = commit.clusters;

    for (const node of commit.nodes) {
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
        case "COMMIT":
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
    force: boolean,
  ) => {
    const node = this.getNodeById(id);
    await node.describeNode(this, setProcessing, set, force);

    await this.updateStorage();
  };

  entitleNode = async (
    id: string,
    set: React.Dispatch<React.SetStateAction<string | undefined>>,
    force?: boolean,
  ) => {
    const node = this.getNodeById(id);
    await node.entitle(set, force);

    await this.updateStorage();
  };

  private updateStorage = async () => {
    const commit: Commit = {
      url: this.url,
      nodes: this.getNodes().map((node) => node.stringify()),
      edges: this.edges,
      clusters: this.clusters,
    };

    await storage.setItem(StorageKey.getWithUrl(this.url), commit);
  };
}
