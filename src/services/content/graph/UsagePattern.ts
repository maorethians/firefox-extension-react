import { isAggregator, isHunk, UsagePatternJson } from "@/types";
import { BaseNode } from "@/services/content/graph/BaseNode.ts";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { Hunk } from "@/services/content/graph/Hunk.ts";
import { LLMClient } from "@/services/content/llm/LLMClient.ts";
import { compact } from "lodash";
import { useAgentic } from "@/services/content/useAgentic.ts";

export class UsagePattern extends BaseNode {
  declare node: UsagePatternJson;
  private usedNodesCache: (Hunk | UsagePattern)[] | null = null;
  private useHunksCache: Hunk[] | null = null;

  constructor(node: UsagePatternJson) {
    super(node);
  }

  promptTemplates = {
    base: (
      useHunks: Hunk[],
      usedHunks: Hunk[],
      usageDescriptions: string[],
      nodesStore: NodesStore,
    ) => {
      const useHunk = useHunks[0];

      const main = (useHunk.nodeType !== "EXTENSION" ? useHunks : usedHunks)
        .map((usedHunk) =>
          usedHunk.promptTemplates.contextualizedBase(nodesStore),
        )
        .join("\n---\n");

      let context;
      if (useHunk.nodeType === "EXTENSION") {
        context = useHunk.promptTemplates.contextualizedBase(nodesStore);
      } else {
        const usedContents = usedHunks.map((usedHunk) =>
          usedHunk.promptTemplates.contextualizedBase(nodesStore),
        );

        context = [...usedContents, ...usageDescriptions].join("\n---\n");
      }

      return (
        "# Code:\n---\n" +
        main +
        "\n---\n\n# Context:\n---\n" +
        context +
        "\n---"
      );
    },
    description: (
      useHunks: Hunk[],
      usedHunks: Hunk[],
      usageDescriptions: string[],
      nodesStore: NodesStore,
    ) => {
      let result = this.promptTemplates.base(
        useHunks,
        usedHunks,
        usageDescriptions,
        nodesStore,
      );

      result +=
        "\n\n# Task:\n---\nProvide an explanation focusing on the specific and evident purposes of the given code," +
        " using the provided context as needed.\n---\n\n# Guidelines:\n---\n- The given code may be either a pure" +
        " code snippet or a transition (with Before/After sections).\n- The provided contexts contain information" +
        " about the identifiers being used in the given code, which can also be a pure code, a code transition, or" +
        " an explanation in natural language.\n- For pure code, focus on its purpose and behavior as-is.\n-" +
        " For transitions, focus on what is added, removed, or modified, and the specific evident purposes behind" +
        " those changes.\n- Avoid focusing on unchanged parts of the transitions, unless needed to clarify the" +
        " changes.\n- Refer to code elements and identifiers in your explanation to ensure clarity.\n---";

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

    const usedUsagePatterns = this.getDependencies(nodesStore);
    for (const usagePattern of usedUsagePatterns) {
      await usagePattern.wrappedDescribeNode(nodesStore, {
        force: options?.force,
      });
    }
    const usageDescriptions = compact(
      usedUsagePatterns.map((usagePattern) => usagePattern.node.description),
    );

    const useHunks = this.getUseHunks(nodesStore);
    const useNode = useHunks[0];
    const usedHunks = this.getUsedNodes(nodesStore).filter(({ node }) =>
      isHunk(node),
    ) as Hunk[];
    const mainHunks = useNode.nodeType !== "EXTENSION" ? useHunks : usedHunks;
    const hunksSemanticContexts = mainHunks.map((hunk) =>
      hunk.getSemanticContexts(nodesStore),
    );

    const semanticContexts: string[] = [];
    let index = -1;
    while (true) {
      const semanticContext = hunksSemanticContexts.map(
        (hunkSemanticContexts) => hunkSemanticContexts[++index],
      );
      if (semanticContext.length > compact(semanticContext).length) {
        break;
      }

      const semanticContextContent = semanticContext.map(
        (sc) => sc.getHunk(nodesStore).content,
      );
      semanticContexts.push(semanticContextContent.join("\n---\n"));
    }

    const generator = await LLMClient.stream(
      this.promptTemplates.description(
        useHunks,
        usedHunks,
        usageDescriptions,
        nodesStore,
      ),
      useAgentic.getState().isAgentic && semanticContexts.length > 0
        ? [this.tools.description(semanticContexts)]
        : undefined,
    );
    await this.streamField("description", generator, options?.parentsToSet);

    await this.entitle();
  }

  getUseHunks(nodesStore: NodesStore) {
    if (this.useHunksCache) {
      return this.useHunksCache;
    }

    this.useHunksCache = nodesStore.edges
      .filter((edge) => edge.type === "DEF_USE")
      .map((edge) => nodesStore.getNodeById(edge.targetId))
      .filter(({ node }) => node.aggregatorIds.includes(this.node.id))
      .filter(({ node }) => isHunk(node)) as Hunk[];

    return this.useHunksCache;
  }

  getUsedNodes(nodesStore: NodesStore) {
    if (this.usedNodesCache) {
      return this.usedNodesCache;
    }

    const useHunks = this.getUseHunks(nodesStore);
    const useNodesId = useHunks.map((useNode) => useNode.node.id);

    this.usedNodesCache = nodesStore.edges
      .filter(
        (edge) => edge.type === "DEF_USE" && useNodesId.includes(edge.targetId),
      )
      .map(
        (edge) => nodesStore.getNodeById(edge.sourceId) as Hunk | UsagePattern,
      );

    return this.usedNodesCache;
  }

  getDependencies(nodesStore: NodesStore): BaseNode[] {
    const usedNodes = this.getUsedNodes(nodesStore);
    return usedNodes.filter(({ node }) => isAggregator(node));
  }

  shouldGenerate(_nodesStore: NodesStore): boolean {
    return true;
  }
}
