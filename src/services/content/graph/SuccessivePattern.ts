import { SuccessivePatternJson } from "@/types";
import { BaseNode } from "@/services/content/graph/BaseNode.ts";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { last } from "lodash";
import { LLMClient } from "@/services/content/llm/LLMClient.ts";
import { Hunk } from "@/services/content/graph/Hunk.ts";

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
      const edgeToNext = nodesStore.edges.find(
        (edge) =>
          edge.type === "SUCCESSION" && edge.sourceId === current!.node.id,
      );
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
    base: async (sequence: Hunk[], nodesStore: NodesStore) =>
      (
        await Promise.all(
          sequence.map((hunk) => hunk.promptTemplates.base(nodesStore)),
        )
      ).join("\n---\n"),
    description: async (sequence: Hunk[], nodesStore: NodesStore) => {
      const basePrompt = await this.promptTemplates.base(sequence, nodesStore);

      let prompt = "# Change:\n\`\`\`\n" + basePrompt + "\n\`\`\`";

      prompt +=
        "\n\n# Task:\n\`\`\`\nProvide an explanation focusing on the specific and evident purposes of the given" +
        " change.\n\`\`\`\n\n# Guidelines:\n\`\`\`\n- Make explicit references to code elements, identifiers, and" +
        " code ids in your explanation to ensure clarity and help connect the explanation to the code.\n\`\`\`";

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
    const prompt = await this.promptTemplates.description(sequence, nodesStore);
    const surroundings = (
      await Promise.all(
        sequence.map((hunk) => hunk.getSurroundings(nodesStore)),
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
