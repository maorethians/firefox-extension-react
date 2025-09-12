import { ClusterJson, RootJson, TraversalComponentJson } from "@/types";
import {
  BaseNode,
  DescendantHunks,
  GenerationType,
} from "@/services/content/graph/BaseNode.ts";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { useDescription } from "@/services/content/useDescription.ts";
import { compact, partition, uniqBy } from "lodash";
import { NodeDescriptorAgent } from "@/services/content/llm/NodeDescriptorAgent.ts";

export class TraversalComponent extends BaseNode {
  declare node: TraversalComponentJson | ClusterJson | RootJson;
  private dependenciesCache: BaseNode[] | null = null;
  private descendantHunksCache: DescendantHunks | null = null;

  constructor(node: TraversalComponentJson | ClusterJson | RootJson) {
    super(node);
  }

  // TODO: check prompts
  promptTemplates = {
    base: (childrenDescription: string[]) => {
      let prompt =
        "# Code Components Description:\n\`\`\`\n" +
        // TODO: any reference to a code id can be made agentic
        childrenDescription.join("\n---\n") +
        "\n\`\`\`\n";

      const reasonType = (this.node as TraversalComponentJson).reasonType;
      if (reasonType) {
        // TODO: reasons can be made agentic
        const reasons = (this.node as TraversalComponentJson).reasons.map(
          (reason) => reason.content,
        );
        prompt +=
          "\nCommon Code Snippets:\n\`\`\`\n" +
          reasons.join("\n---\n") +
          "\n\`\`\`";
      }

      return prompt;
    },
    description: (childrenDescription: string[]) => {
      let prompt = this.promptTemplates.base(childrenDescription);

      const reasons = (this.node as TraversalComponentJson).reasons;

      prompt +=
        "\n\n# Task:\n\`\`\`\nAnalyze the Code Components Description and provide a cohesive explanation" +
        " that captures the collective intent behind the components.\n\`\`\`\n\nGuidelines:\n\`\`\`\n- Be specific:" +
        " explain the concrete behavior or outcome they support, not just general goals.\n- Do not repeat or" +
        " rephrase the same ideas in different words. Each point should add new insight.\n- Make explicit references" +
        " to code elements, identifiers, and code ids in your explanation to ensure clarity and help connect the" +
        " explanation to the provided content." +
        (reasons
          ? "\n- Use Common Code Snippets to find relations between components as needed in your explanation."
          : "") +
        "\n\`\`\`\n";

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

    const children = this.getDependencies(nodesStore);
    // TODO: make it batch
    for (const child of children) {
      await child.wrappedDescribeNode(nodesStore, {
        invalidateCache: this.shouldGenerate(nodesStore)
          ? undefined
          : options?.invalidateCache,
        parentsToSet: this.shouldGenerate(nodesStore)
          ? undefined
          : [...(options?.parentsToSet ?? []), this.node.id],
      });
    }
    const childrenDescription = compact(
      children.map((child) => child.node.description),
    );

    if (childrenDescription.length === 1) {
      this.node.description = childrenDescription[0];
      this.node.title = children[0].node.title;
      useDescription
        .getState()
        .setDescription(this.node.id, this.node.description);
      return;
    }

    const prompt = this.promptTemplates.description(childrenDescription);
    const agent = new NodeDescriptorAgent();
    await agent.init();
    const response = await agent.invoke(prompt);
    await this.streamField("description", response, options?.parentsToSet);

    await this.entitle();
  }

  getDependencies(nodesStore: NodesStore): BaseNode[] {
    if (this.dependenciesCache) {
      return this.dependenciesCache;
    }

    this.dependenciesCache = nodesStore
      .getSourceEdges(this.node.id)
      .filter((edge) => edge.type === "EXPANSION")
      .map((edge) => nodesStore.getNodeById(edge.targetId));

    return this.dependenciesCache;
  }

  shouldGenerate(nodesStore: NodesStore): boolean {
    const children = this.getDependencies(nodesStore);
    return children.length > 1;
  }

  // TODO: get referred promptIds and highlight them
  getDescendantHunks = (nodesStore: NodesStore) => {
    if (this.descendantHunksCache) {
      return this.descendantHunksCache;
    }

    const children = this.getDependencies(nodesStore);
    const childrenDescendentHunks = children.map((child) =>
      child.getDescendantHunks(nodesStore),
    );

    let highestPriorityGenerationType = GenerationType.Hunk;
    for (const childDescendentHunks of childrenDescendentHunks) {
      if (
        childDescendentHunks.firstGenerationType < highestPriorityGenerationType
      ) {
        highestPriorityGenerationType =
          childDescendentHunks.firstGenerationType;
      }
    }

    const [prioritizedDescendantHunks, commonDescendantHunks] = partition(
      childrenDescendentHunks,
      (childrenDescendentHunks) =>
        childrenDescendentHunks.firstGenerationType ===
        highestPriorityGenerationType,
    );

    const firstGeneration = uniqBy(
      prioritizedDescendantHunks
        .map((descendantHunks) => descendantHunks.firstGeneration)
        .flat(),
      (hunk) => hunk.node.id,
    );
    const extendedGenerations = uniqBy(
      [
        ...prioritizedDescendantHunks
          .map((descendantHunks) => descendantHunks.extendedGenerations)
          .flat(),
        ...commonDescendantHunks
          .map((descendantHunks) => [
            ...descendantHunks.firstGeneration,
            ...descendantHunks.extendedGenerations,
          ])
          .flat(),
      ],
      (hunk) => hunk.node.id,
    );

    this.descendantHunksCache = {
      firstGeneration,
      firstGenerationType: highestPriorityGenerationType,
      extendedGenerations,
    };
    return this.descendantHunksCache;
  };
}
