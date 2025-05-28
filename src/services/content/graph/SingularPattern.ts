import { SingularPatternJson } from "@/types";
import { BaseNode } from "@/services/content/graph/BaseNode.ts";
import { NodesStore } from "@/services/content/NodesStore.ts";
import React from "react";

export class SingularPattern extends BaseNode {
  declare node: SingularPatternJson;

  constructor(node: SingularPatternJson) {
    super(node);
  }

  async describeNode(
    nodesStore: NodesStore,
    setProcessing: React.Dispatch<React.SetStateAction<boolean>>,
    set?: React.Dispatch<React.SetStateAction<string | undefined>>,
    options?: {
      force?: boolean;
      advanced?: boolean;
      entitle?: boolean;
      agent?: boolean;
    },
  ): Promise<void> {
    const descriptionCache = this.node.description;
    if (descriptionCache && !options?.force) {
      return;
    }

    const leadEdge = nodesStore.edges.filter(
      (edge) => edge.type === "EXPANSION" && edge.sourceId === this.node.id,
    )[0];
    if (!leadEdge) {
      return;
    }

    const lead = nodesStore.getNodeById(leadEdge.targetId);
    await lead.describeNode(nodesStore, setProcessing, set, {
      force: options?.force,
      entitle: true,
    });
    this.node.description = lead.node.description;

    if (options?.entitle) {
      await this.entitle();
    }
  }
}
