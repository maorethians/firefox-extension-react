import { isAggregator, isHunk, UsagePatternJson } from "@/types";
import { BaseNode } from "@/services/content/graph/BaseNode.ts";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { Hunk } from "@/services/content/graph/Hunk.ts";
import { GroqClient } from "@/services/content/llm/GroqClient.ts";
import { compact, partition } from "lodash";
import React from "react";

export class UsagePattern extends BaseNode {
  declare node: UsagePatternJson;

  constructor(node: UsagePatternJson) {
    super(node);
  }

  promptTemplates = {
    base: (
      useNodes: Hunk[],
      usedHunks: Hunk[],
      usageDescriptions: string[],
      nodesStore: NodesStore,
    ) => {
      const useNode = useNodes[0];

      const main = (useNode.nodeType !== "EXTENSION" ? useNodes : usedHunks)
        .map((usedHunk) => usedHunk.promptTemplates.base(nodesStore))
        .join("\n---\n");

      let context;
      if (useNode.nodeType === "EXTENSION") {
        context = useNode.promptTemplates.base(nodesStore);
      } else {
        const usedContents = usedHunks.map((usedHunk) =>
          usedHunk.promptTemplates.base(nodesStore),
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
      useNodes: Hunk[],
      usedHunks: Hunk[],
      usageDescriptions: string[],
      nodesStore: NodesStore,
    ) => {
      let result = this.promptTemplates.base(
        useNodes,
        usedHunks,
        usageDescriptions,
        nodesStore,
      );

      result +=
        "\n\n# Task:\n---\nProvide an explanation focusing on the specific and evident purposes of the give code," +
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
    setProcessing: React.Dispatch<React.SetStateAction<boolean>>,
    set?: React.Dispatch<React.SetStateAction<string | undefined>>,
    force?: boolean,
  ): Promise<void> {
    const descriptionCache = this.node.description;
    if (descriptionCache && !force) {
      return;
    }

    const useNodes = nodesStore.edges
      .filter(
        (edge) => edge.type === "EXPANSION" && edge.sourceId === this.node.id,
      )
      .map((edge) => nodesStore.getNodeById(edge.targetId))
      .filter(({ node }) => isHunk(node)) as Hunk[];
    const useNodesId = useNodes.map((useNode) => useNode.node.id);

    const usedNodes = nodesStore.edges
      .filter(
        (edge) => edge.type === "DEF_USE" && useNodesId.includes(edge.targetId),
      )
      .map(
        (edge) => nodesStore.getNodeById(edge.sourceId) as Hunk | UsagePattern,
      );

    const [usedUsagePatterns, usedHunks] = partition(usedNodes, ({ node }) =>
      isAggregator(node),
    ) as [UsagePattern[], Hunk[]];

    for (const usagePattern of usedUsagePatterns) {
      await usagePattern.describeNode(nodesStore, () => {}, undefined, force);
    }
    const usageDescriptions = compact(
      usedUsagePatterns.map((usagePattern) => usagePattern.node.description),
    );

    const generator = await GroqClient.stream(
      this.promptTemplates.description(
        useNodes,
        usedHunks,
        usageDescriptions,
        nodesStore,
      ),
    );
    await this.streamField("description", setProcessing, generator, set);
  }
}
