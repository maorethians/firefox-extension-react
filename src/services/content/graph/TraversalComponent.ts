import { ClusterJson, CommitJson, TraversalComponentJson } from "@/types";
import { BaseNode } from "@/services/content/graph/BaseNode.ts";
import { NodesStore } from "@/services/content/NodesStore.ts";
import React from "react";
import { compact } from "lodash";
import { GroqClient } from "@/services/content/llm/GroqClient.ts";

export class TraversalComponent extends BaseNode {
  declare node: TraversalComponentJson | ClusterJson | CommitJson;

  constructor(node: TraversalComponentJson | ClusterJson | CommitJson) {
    super(node);
  }

  // TODO: check prompts
  promptTemplates = {
    base: (childrenDescription: string[]) => {
      let result =
        "# Code Components Description:\n---\n" +
        childrenDescription.join("\n---\n") +
        "\n---\n";

      const reasonType = (this.node as TraversalComponentJson).reasonType;
      if (!reasonType) {
        return result;
      }

      const reasons = (this.node as TraversalComponentJson).reasons;
      result +=
        "\nCommon Code Snippets:\n---\n" + reasons.join("\n---\n") + "\n---";

      return result;
    },
    description: (childrenDescription: string[]) => {
      let result = this.promptTemplates.base(childrenDescription);

      const reasons = (this.node as TraversalComponentJson).reasons;

      result +=
        "\n\n# Task:\n---\nAnalyze the descriptions and provide a cohesive explanation that captures the collective" +
        " intent behind the components.\n---\n\nGuidelines:\n---\n- Be specific: explain the concrete behavior or" +
        " outcome they support, not just general goals.\n- Do not repeat or rephrase the same ideas in different" +
        " words. Each point should add new insight." +
        (reasons
          ? "\n- Use common code snippets to find relations between components as needed in your explanation."
          : "") +
        "\n---\n";

      console.log(result);
      return result;
    },
  };

  async describeNode(
    nodesStore: NodesStore,
    setProcessing: React.Dispatch<React.SetStateAction<boolean>>,
    set?: React.Dispatch<React.SetStateAction<string | undefined>>,
    options?: {
      force?: boolean;
      advanced?: boolean;
      entitle?: boolean;
      agent?: boolean;
    },
  ): Promise<void> {
    const descriptionCache = this.node.description;
    if (descriptionCache && !options?.force) {
      return;
    }

    const children = nodesStore.edges
      .filter(
        (edge) => edge.type === "EXPANSION" && edge.sourceId === this.node.id,
      )
      .map((edge) => nodesStore.getNodeById(edge.targetId));
    for (const child of children) {
      await child.describeNode(nodesStore, () => {}, undefined, {
        force: options?.force,
        entitle: true,
        agent: options?.agent,
      });
    }
    const childrenDescription = compact(
      children.map((child) => child.node.description),
    );

    if (childrenDescription.length === 1) {
      this.node.description = childrenDescription[0];
      this.node.title = children[0].node.title;
      set?.(this.node.description);
      return;
    }

    const generator = await GroqClient.stream(
      this.promptTemplates.description(childrenDescription),
    );
    await this.streamField("description", setProcessing, generator, set);

    if (options?.entitle) {
      await this.entitle();
    }
  }
}
