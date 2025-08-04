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
    base: async (similarHunks: Hunk[], nodesStore: NodesStore) =>
      (
        await Promise.all(
          similarHunks.map((hunk) => hunk.promptTemplates.base(nodesStore)),
        )
      ).join("\n---\n"),
    description: async (similarHunks: Hunk[], nodesStore: NodesStore) => {
      const basePrompt = await this.promptTemplates.base(
        similarHunks,
        nodesStore,
      );

      let prompt = "# Change:\n\`\`\`\n" + basePrompt + "\n\`\`\`";

      prompt +=
        "\n\n# Task:\n\`\`\`\nProvide an explanation focusing on the specific and evident purposes of applying this" +
        " same change across these locations.\n\`\`\`\n\n# Guidelines:\n\`\`\`\n- Make explicit references to code" +
        " elements, identifiers, and code ids in your explanation to ensure clarity and help connect the explanation" +
        " to the code.\n\`\`\`";

      return prompt;
    },
  };

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

    const prompt = await this.promptTemplates.description(
      similarNodes,
      nodesStore,
    );
    const surroundings = (
      await Promise.all(
        similarNodes.map((hunk) => hunk.getSurroundings(nodesStore)),
      )
    ).flat();
    const generator = await LLMClient.stream(
      prompt,
      this.tools.description(surroundings),
    );
    await this.streamField("description", generator, options?.parentsToSet);

    await this.entitle();
  }

  shouldGenerate(_nodesStore: NodesStore): boolean {
    return true;
  }
}
