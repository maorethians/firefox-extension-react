import { SuccessivePatternJson } from "@/types";
import {
  BaseNode,
  DescendantHunks,
  GenerationType,
} from "@/services/content/graph/BaseNode.ts";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { last } from "lodash";
import { Hunk } from "@/services/content/graph/Hunk.ts";
import { tools } from "@/services/content/llm/tools.ts";
import { NodeDescriptorAgent } from "@/services/content/llm/agents/NodeDescriptorAgent";
import { HumanMessage } from "@langchain/core/messages";

export class SuccessivePattern extends BaseNode {
  declare node: SuccessivePatternJson;
  sequenceCache: Hunk[] | undefined;

  constructor(node: SuccessivePatternJson) {
    super(node);
  }

  getSequence(nodesStore: NodesStore) {
    if (this.sequenceCache) {
      return this.sequenceCache;
    }

    const head = nodesStore.getNodeById(this.node.headId);
    const sequence: Hunk[] = [head as Hunk];

    while (true) {
      const current = last(sequence);
      const edgeToNext = nodesStore
        .getSourceEdges(current!.node.id)
        .find((edge) => edge.type === "SUCCESSION");
      if (!edgeToNext) {
        break;
      }

      const next = nodesStore.getNodeById(edgeToNext.targetId);
      sequence.push(next as Hunk);
    }

    this.sequenceCache = sequence;

    return sequence;
  }

  promptTemplates = {
    base: (sequence: Hunk[], nodesStore: NodesStore) =>
      sequence
        .map((hunk) => hunk.promptTemplates.base(nodesStore))
        .join("\n---\n"),
    description: (sequence: Hunk[], nodesStore: NodesStore) => {
      const basePrompt = this.promptTemplates.base(sequence, nodesStore);

      let prompt = "# Subject:\n\`\`\`\n" + basePrompt + "\n\`\`\`";

      prompt +=
        "\n\n# Task:\n\`\`\`\nProvide an explanation focusing on the specific and evident purposes of the" +
        " Subject.\n\`\`\`\n\n# Guidelines:\n\`\`\`\n- Treat the items in the Subject as consecutive segments from" +
        " the source code. \n- Make explicit references to code elements, identifiers, and code ids in your" +
        " explanation to ensure clarity and help connect the explanation to the provided content.\n\`\`\`";

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

    const sequence = this.getSequence(nodesStore);
    const prompt = this.promptTemplates.description(sequence, nodesStore);
    const surroundings = (
      await Promise.all(
        sequence.map((hunk) => hunk.getSurroundings(nodesStore)),
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

  getDescendantHunks(nodesStore: NodesStore): DescendantHunks {
    const { firstGeneration, extendedGenerations } =
      super.getUntypedDescendantHunks(nodesStore);
    return {
      firstGeneration,
      firstGenerationType: GenerationType.Successive,
      extendedGenerations,
    };
  }
}
