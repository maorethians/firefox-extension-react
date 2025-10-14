import { SimilarityPatternJson } from "@/types";
import { BaseNode, GenerationType } from "@/services/content/graph/BaseNode.ts";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { Hunk } from "@/services/content/graph/Hunk.ts";
import { tools } from "@/services/content/llm/tools.ts";
import { NodeDescriptorAgent } from "@/services/content/llm/agents/NodeDescriptorAgent";
import { HumanMessage } from "@langchain/core/messages";

export class SimilarityPattern extends BaseNode {
  declare node: SimilarityPatternJson;

  constructor(node: SimilarityPatternJson) {
    super(node);
  }

  promptTemplates = {
    base: (similarHunks: Hunk[], nodesStore: NodesStore) =>
      similarHunks
        .map((hunk) => hunk.promptTemplates.base(nodesStore))
        .join("\n---\n"),
    description: (similarHunks: Hunk[], nodesStore: NodesStore) => {
      const basePrompt = this.promptTemplates.base(similarHunks, nodesStore);

      let prompt = "# Subject:\n\`\`\`\n" + basePrompt + "\n\`\`\`";

      prompt +=
        "\n\n# Task:\n\`\`\`\nProvide an explanation focusing on the specific and evident purposes of the similar" +
        " code segments in the Subject, considering their respective locations.\n\`\`\`\n\n# Guidelines:\n\`\`\`\n-" +
        " Make explicit references to code elements, identifiers, and code ids in your explanation to ensure clarity" +
        " and help connect the explanation to the provided content.\n\`\`\`";

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

    const leadId = nodesStore
      .getSourceEdges(this.node.id)
      .filter((edge) => edge.type === "EXPANSION")
      .map((edge) => edge.targetId)[0];
    const leadSimilarNodesId = nodesStore
      .getSourceEdges(leadId)
      .filter((edge) => edge.type === "SIMILARITY")
      .map((edge) => edge.targetId);
    const similarNodesId = [leadId, ...leadSimilarNodesId];
    const similarNodes = similarNodesId.map(
      (id) => nodesStore.getNodeById(id) as Hunk,
    );

    const prompt = this.promptTemplates.description(similarNodes, nodesStore);
    const surroundings = (
      await Promise.all(
        similarNodes.map((hunk) => hunk.getSurroundings(nodesStore)),
      )
    ).flat();
    const fetchSurroundingsTool = tools.fetchCodeSurroundings(surroundings);
    const agent = new NodeDescriptorAgent(
      fetchSurroundingsTool ? [fetchSurroundingsTool] : [],
    );
    await agent.init();
    const response = await agent.invoke({
      messages: [new HumanMessage(prompt)],
    });
    await this.streamField("description", response, options?.parentsToSet);

    await this.entitle();
  }

  shouldGenerate(_nodesStore: NodesStore): boolean {
    return true;
  }

  getDescendantHunks = (nodesStore: NodesStore) => {
    const { firstGeneration, extendedGenerations } =
      super.getUntypedDescendantHunks(nodesStore);
    return {
      firstGeneration,
      firstGenerationType: GenerationType.Similarity,
      extendedGenerations,
    };
  };
}
