import { SingularPatternJson } from "@/types";
import { BaseNode } from "@/services/content/graph/BaseNode.ts";
import { NodesStore } from "@/services/content/NodesStore.ts";

export class SingularPattern extends BaseNode {
  declare node: SingularPatternJson;

  constructor(node: SingularPatternJson) {
    super(node);
  }

  async describeNode(
    nodesStore: NodesStore,
    options?: {
      invalidateCache?: boolean;
      parentsToSet?: string[];
    },
  ): Promise<void> {
    const descriptionCache = this.node.description;
    if (descriptionCache && !options?.invalidateCache) {
      return;
    }

    const lead = this.getDependencies(nodesStore)[0];
    if (!lead) {
      return;
    }

    await lead.wrappedDescribeNode(nodesStore, {
      invalidateCache: options?.invalidateCache,
      parentsToSet: [...(options?.parentsToSet ?? []), this.node.id],
    });
    this.node.description = lead.node.description;

    await this.entitle();
  }

  getDependencies(nodesStore: NodesStore): BaseNode[] {
    const leadEdge = nodesStore.edges.filter(
      (edge) => edge.type === "EXPANSION" && edge.sourceId === this.node.id,
    )[0];
    if (!leadEdge) {
      return [];
    }

    const lead = nodesStore.getNodeById(leadEdge.targetId);
    return [lead];
  }
}
