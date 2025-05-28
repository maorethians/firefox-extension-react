import { HunkJson } from "@/types";
import { BaseNode } from "@/services/content/graph/BaseNode.ts";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { compact } from "lodash";
import { GroqClient } from "@/services/content/llm/GroqClient.ts";
import React from "react";

export class Hunk extends BaseNode {
  declare node: HunkJson;
  contexts: Hunk[] | undefined;

  constructor(node: HunkJson) {
    super(node);
  }

  promptTemplates = {
    base: (nodesStore: NodesStore) => {
      const hunk = this.getHunk(nodesStore);
      return hunk.src
        ? "## Before:\n" + hunk.src + "\n\n## After:\n" + hunk.content
        : hunk.content;
    },
    contextualizedBase: (nodesStore: NodesStore) => {
      const hunk = this.getHunk(nodesStore);
      return hunk.src
        ? "## Before:\n" +
            hunk.src +
            "\n\n## After:\n(" +
            hunk.context +
            ")\n" +
            hunk.content
        : "(" + hunk.context + ")\n" + hunk.content;
    },
    description: (aggregatorsDescription: string[], nodesStore: NodesStore) => {
      const base = this.promptTemplates.contextualizedBase(nodesStore);

      const hunk = this.getHunk(nodesStore);

      let result =
        `# ${hunk.src ? "Change" : "Code"}:\n---\n` + base + "\n---\n";
      if (aggregatorsDescription.length !== 0) {
        result +=
          "\n# Context:\n---\n" +
          aggregatorsDescription
            .map((description, index) => index + 1 + "-" + description)
            .join("\n---\n") +
          "\n---\n";
      }

      result +=
        `\n# Task:\n---\nIdentify and explain the specific role or function of the given ${hunk.src ? "change" : "code"} ${aggregatorsDescription.length !== 0 ? "within the provided context" : ""}.` +
        (aggregatorsDescription.length !== 0
          ? `\n---\n\n# Guidelines:\n---\n- Focus on how the code contributes to the surrounding logic, structure, or behavior described in the context.\n- Avoid rephrasing or summarizing the full context.\n---`
          : "");

      return result;
    },
  };

  getHunk = (nodesStore: NodesStore) => {
    const result: { content: string; context: string; src?: string } = {
      content: this.node.content,
      context: this.getContextString(nodesStore),
    };

    if (this.node.srcs) {
      result.src = this.node.srcs.join("\n");
    }

    return result;
  };

  private getContexts = (nodesStore: NodesStore) => {
    if (this.contexts) {
      return this.contexts;
    }

    const contexts: Hunk[] = [];

    let current = nodesStore.getNodeById(this.node.id);
    while (true) {
      const edgeToNext = nodesStore.edges.find(
        (edge) => edge.type === "CONTEXT" && edge.sourceId === current.node.id,
      );
      if (!edgeToNext) {
        break;
      }

      const next = nodesStore.getNodeById(edgeToNext.targetId) as Hunk;
      contexts.push(next);

      current = next;
    }

    this.contexts = contexts;

    return contexts;
  };

  getSemanticContexts = (nodesStore: NodesStore) => {
    return this.getContexts(nodesStore).filter(
      (context) => context.nodeType === "SEMANTIC_CONTEXT",
    );
  };

  private getContextString = (nodesStore: NodesStore) => {
    const contexts = this.getContexts(nodesStore).filter(
      (context) => context.nodeType === "LOCATION_CONTEXT",
    );
    const reverseContexts = contexts.reverse();
    return reverseContexts
      .map((context) => (context as Hunk).node.content)
      .join("-->");
  };

  describeNode = async (
    nodesStore: NodesStore,
    setProcessing: React.Dispatch<React.SetStateAction<boolean>>,
    set?: React.Dispatch<React.SetStateAction<string | undefined>>,
    options?: {
      force?: boolean;
      // Hunk is always advanced (its contribution to its pattern)
      advanced?: boolean;
      entitle?: boolean;
      agent?: boolean;
    },
  ): Promise<void> => {
    const descriptionCache = this.node.description;
    if (descriptionCache && !options?.force) {
      return;
    }

    const aggregatorIds = this.node.aggregatorIds;
    const aggregators = aggregatorIds
      .map((id) => nodesStore.getNodeById(id))
      .filter((aggregator) => aggregator.nodeType !== "SINGULAR");
    // TODO: make it batch
    for (const aggregator of aggregators) {
      await aggregator.describeNode(nodesStore, () => {}, undefined, {
        force: options?.force,
        entitle: true,
        agent: options?.agent,
      });
    }
    const aggregatorsDescription = compact(
      aggregators.map((aggregator) => aggregator.node.description),
    );

    const semanticContexts = this.getSemanticContexts(nodesStore);
    const generator = await GroqClient.stream(
      this.promptTemplates.description(aggregatorsDescription, nodesStore),
      options?.agent && semanticContexts.length > 0
        ? [
            this.tools.description(
              semanticContexts.map(
                (context) => context.getHunk(nodesStore).content,
              ),
            ),
          ]
        : undefined,
    );
    await this.streamField("description", setProcessing, generator, set);

    if (options?.entitle) {
      await this.entitle();
    }
  };
}
