import { ClusterJson, RootJson, TraversalComponentJson } from "@/types";
import { BaseNode } from "@/services/content/graph/BaseNode.ts";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { LLMClient } from "@/services/content/llm/LLMClient.ts";
import { useDescription } from "@/services/content/useDescription.ts";
import { compact } from "lodash";

export class TraversalComponent extends BaseNode {
  declare node: TraversalComponentJson | ClusterJson | RootJson;
  private dependenciesCache: BaseNode[] | null = null;

  constructor(node: TraversalComponentJson | ClusterJson | RootJson) {
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

    const children = this.getDependencies(nodesStore);
    // TODO: make it batch
    for (const child of children) {
      await child.wrappedDescribeNode(nodesStore, {
        force: options?.force,
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

    const generator = await LLMClient.stream(
      this.promptTemplates.description(childrenDescription),
    );
    await this.streamField("description", generator, options?.parentsToSet);

    await this.entitle();
  }

  getDependencies(nodesStore: NodesStore): BaseNode[] {
    if (this.dependenciesCache) {
      return this.dependenciesCache;
    }

    this.dependenciesCache = nodesStore.edges
      .filter(
        (edge) => edge.type === "EXPANSION" && edge.sourceId === this.node.id,
      )
      .map((edge) => nodesStore.getNodeById(edge.targetId));

    return this.dependenciesCache;
  }

  shouldGenerate(nodesStore: NodesStore): boolean {
    const children = this.getDependencies(nodesStore);
    return children.length > 1;
  }
}
