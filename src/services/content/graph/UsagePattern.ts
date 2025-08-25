import { EdgeType, isAggregator, isHunk, UsagePatternJson } from "@/types";
import {
  BaseNode,
  DescendantHunks,
  GenerationType,
} from "@/services/content/graph/BaseNode.ts";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { Hunk } from "@/services/content/graph/Hunk.ts";
import { LLMClient } from "@/services/content/llm/LLMClient.ts";
import uniqueBy from "@popperjs/core/lib/utils/uniqueBy";
import { useSubjectId } from "@/services/content/useSubjectId.ts";
import { partition } from "lodash";

export class UsagePattern extends BaseNode {
  declare node: UsagePatternJson;
  private usedNodesCache: (Hunk | UsagePattern)[] | null = null;
  private useHunksCache: Hunk[] | null = null;
  private notSubjectDescendantHunksCache: DescendantHunks | null = null;

  constructor(node: UsagePatternJson) {
    super(node);
  }

  promptTemplates = {
    description: (
      useHunks: Hunk[],
      usedHunks: Hunk[],
      // TODO: any reference to a code id can be made agentic
      usagePatterns: {
        description: string;
        ids: { id: string; identifier: string }[];
      }[],
      nodesStore: NodesStore,
    ) => {
      const hasExtension = useHunks[0].nodeType === "EXTENSION";

      const mainHunks = hasExtension ? usedHunks : useHunks;
      const sideHunks = hasExtension ? useHunks : usedHunks;

      let prompt =
        "# Subject:\n\`\`\`\n" +
        mainHunks
          .map((hunk) => hunk.promptTemplates.base(nodesStore))
          .join("\n---\n") +
        "\n\`\`\`\n\n# Context:\n\`\`\`\n";

      if (usagePatterns.length > 0) {
        prompt +=
          usagePatterns
            .map(
              (usagePattern) =>
                usagePattern.ids
                  .map(
                    ({ id, identifier }) =>
                      "{ id: " + id + ", identifier: " + identifier + " }",
                  )
                  .join("\n") +
                "\n" +
                usagePattern.description,
            )
            .join("\n---\n") + "\n---\n";
      }

      prompt += sideHunks
        .map((hunk) => hunk.promptTemplates.base(nodesStore))
        .join("\n---\n");

      prompt += "\n\`\`\`";

      prompt +=
        "\n\n# Task:\n\`\`\`\nProvide an explanation focusing on the specific and evident purposes of the Subject." +
        " \n\`\`\`\n\n# Guidelines:\n\`\`\`\n- Context contains pure code or explanatory content related to" +
        " identifiers used in the Subject.\n- Keep the explanation focused on the Subject. Refer to the Context only" +
        " when needed to clarify identifiers or reasoning.\n- Do not summarize or paraphrase the Context unless" +
        " directly relevant to understanding the Subject.\n- Make explicit references to code elements, identifiers," +
        " and code ids in your explanation to ensure clarity and help connect the explanation to the provided" +
        " content.\n\`\`\`";

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

    const usedUsagePatterns = this.getDependencies(nodesStore);
    for (const usagePattern of usedUsagePatterns) {
      await usagePattern.wrappedDescribeNode(nodesStore);
    }
    const usedUsagePatternsDetail = usedUsagePatterns
      .filter((usagePattern) => usagePattern.node.description)
      .map((usagePattern) => ({
        description: usagePattern.node.description!,
        ids: usagePattern.getUseHunks(nodesStore).map((hunk) => ({
          id: hunk.getDetail(nodesStore).promptId,
          identifier: hunk.node.identifiers!.join(", "),
        })),
      }));

    const useHunks = this.getUseHunks(nodesStore);
    const usedHunks = this.getUsedNodes(nodesStore).filter(({ node }) =>
      isHunk(node),
    ) as Hunk[];

    const prompt = this.promptTemplates.description(
      useHunks,
      usedHunks,
      usedUsagePatternsDetail,
      nodesStore,
    );
    const surroundings = (
      await Promise.all(
        [...useHunks, ...usedHunks].map((hunk) =>
          hunk.getSurroundings(nodesStore),
        ),
      )
    ).flat();
    const response = await LLMClient.invoke(
      prompt,
      this.tools.description(surroundings),
    );
    await this.streamField("description", response, options?.parentsToSet);

    await this.entitle();
  }

  getUseHunks(nodesStore: NodesStore) {
    if (this.useHunksCache) {
      return this.useHunksCache;
    }

    const useHunks = nodesStore
      .getTypeEdges(EdgeType.DEF_USE)
      .map((edge) => nodesStore.getNodeById(edge.targetId))
      .filter(({ node }) => node.aggregatorIds.includes(this.node.id))
      .filter(({ node }) => isHunk(node)) as Hunk[];
    this.useHunksCache = uniqueBy(useHunks, (useHunk) => useHunk.node.id);

    return this.useHunksCache;
  }

  getUsedNodes(nodesStore: NodesStore) {
    if (this.usedNodesCache) {
      return this.usedNodesCache;
    }

    const useHunks = this.getUseHunks(nodesStore);
    const useHunksId = useHunks.map((useNode) => useNode.node.id);

    const usedNodes = useHunksId
      .map((hunkId) => nodesStore.getTargetEdges(hunkId))
      .flat()
      .filter((edge) => edge.type === "DEF_USE")
      .map(
        (edge) => nodesStore.getNodeById(edge.sourceId) as Hunk | UsagePattern,
      );
    this.usedNodesCache = uniqueBy(usedNodes, (useNode) => useNode.node.id);

    return this.usedNodesCache;
  }

  getDependencies(nodesStore: NodesStore) {
    const usedNodes = this.getUsedNodes(nodesStore);
    return usedNodes.filter(({ node }) => isAggregator(node)) as UsagePattern[];
  }

  shouldGenerate(_nodesStore: NodesStore): boolean {
    return true;
  }

  getDescendantHunks = (nodesStore: NodesStore) => {
    const { firstGeneration, extendedGenerations } =
      super.getUntypedDescendantHunks(nodesStore);

    const subjectId = useSubjectId.getState().subjectId;
    if (this.node.id === subjectId) {
      return {
        firstGeneration,
        firstGenerationType: GenerationType.Usage,
        extendedGenerations,
      };
    }

    if (this.notSubjectDescendantHunksCache) {
      return this.notSubjectDescendantHunksCache;
    }

    const useHunksId = this.getUseHunks(nodesStore).map((hunk) => hunk.node.id);
    const [firstGenerationUseHunks, restFirstGeneration] = partition(
      firstGeneration,
      (hunk) => useHunksId.includes(hunk.node.id),
    );

    this.notSubjectDescendantHunksCache = {
      firstGeneration: firstGenerationUseHunks,
      firstGenerationType: GenerationType.Usage,
      extendedGenerations: [...extendedGenerations, ...restFirstGeneration],
    };
    return this.notSubjectDescendantHunksCache;
  };
}
