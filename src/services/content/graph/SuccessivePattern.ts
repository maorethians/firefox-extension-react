import { SuccessivePatternJson } from "@/types";
import { BaseNode } from "@/services/content/graph/BaseNode.ts";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { last } from "lodash";
import { GroqClient } from "@/services/content/llm/GroqClient.ts";
import { Hunk } from "@/services/content/graph/Hunk.ts";
import React from "react";

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

  // TODO: check prompts
  promptTemplates = {
    base: (sequence: Hunk[], nodesStore: NodesStore) => {
      const sequenceContents = sequence.map((node) => {
        const hunk = node.getHunk(nodesStore);

        let result = node.promptTemplates.base(nodesStore);
        if (hunk.src) {
          result = "---\n" + result + "\n---";
        }

        return result;
      });

      const hunk = sequence[0].getHunk(nodesStore);

      return "(" + hunk.context + ")\n" + sequenceContents.join("\n");
    },
    description: (sequence: Hunk[], nodesStore: NodesStore) => {
      let result =
        "# Code:\n---\n" +
        this.promptTemplates.base(sequence, nodesStore) +
        "\n---";

      result +=
        "\n\n# Task:\n---\nProvide an explanation focusing on the specific and evident purposes of the given" +
        " code.\n---\n\n# Guidelines:\n---\n- The given code may be either a pure code snippet or a transition" +
        " (with Before/After sections).\n- For pure code, focus on its purpose and behavior as-is.\n- For" +
        " transitions, focus on what is added, removed, or modified, and the specific evident purposes behind those" +
        " changes.\n- Avoid focusing on unchanged parts of the transitions, unless needed to clarify the" +
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

    const generator = await GroqClient.stream(
      this.promptTemplates.description(
        this.getSequence(nodesStore),
        nodesStore,
      ),
    );
    await this.streamField("description", setProcessing, generator, set);
  }
}
