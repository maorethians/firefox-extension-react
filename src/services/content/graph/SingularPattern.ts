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
      force?: boolean;
      parentsToSet?: string[];
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
    await lead.wrappedDescribeNode(nodesStore, {
      force: options?.force,
      parentsToSet: [...(options?.parentsToSet ?? []), this.node.id],
    });
    this.node.description = lead.node.description;

    await this.entitle();
  }
}
