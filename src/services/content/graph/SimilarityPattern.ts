import { SimilarityPatternJson } from "@/types";
import { BaseNode } from "@/services/content/graph/BaseNode.ts";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { LLMClient } from "@/services/content/llm/LLMClient.ts";
import { Hunk } from "@/services/content/graph/Hunk.ts";

export class SimilarityPattern extends BaseNode {
  declare node: SimilarityPatternJson;

  constructor(node: SimilarityPatternJson) {
    super(node);
  }

  promptTemplates = {
    base: (probeNode: Hunk, nodesStore: NodesStore) =>
      probeNode.promptTemplates.base(nodesStore),
    description: (
      probeNode: Hunk,
      contextStrings: string[],
      nodesStore: NodesStore,
    ) => {
      let result =
        "# Change:\n---\n" +
        this.promptTemplates.base(probeNode, nodesStore) +
        "\n---";

      result +=
        "\n\n# Locations Affected:\n---\n" +
        contextStrings.map((contextString) => "- " + contextString).join("\n") +
        "\n---";

      result +=
        "\n\n# Task:\n---\nProvide an explanation focusing on the specific and evident purposes of applying this" +
        " same change across these locations.\n---";

      return result;
    },
  };

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

    const leadId = nodesStore.edges
      .filter(
        (edge) => edge.type === "EXPANSION" && edge.sourceId === this.node.id,
      )
      .map((edge) => edge.targetId)[0];
    const leadSimilarNodesId = nodesStore.edges
      .filter((edge) => edge.type === "SIMILARITY" && edge.sourceId === leadId)
      .map((edge) => edge.targetId);
    const similarNodesId = [leadId, ...leadSimilarNodesId];
    const similarNodes = similarNodesId.map(
      (id) => nodesStore.getNodeById(id) as Hunk,
    );
    const contextStrings = similarNodes.map(
      (node) => node.getHunk(nodesStore).context,
    );

    const generator = await LLMClient.stream(
      this.promptTemplates.description(
        similarNodes[0],
        contextStrings,
        nodesStore,
      ),
    );
    await this.streamField("description", generator, options?.parentsToSet);

    await this.entitle();
  }
}
