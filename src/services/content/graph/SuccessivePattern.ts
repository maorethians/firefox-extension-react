import { SuccessivePatternJson } from "@/types";
import { BaseNode } from "@/services/content/graph/BaseNode.ts";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { last } from "lodash";
import { GroqClient } from "@/services/content/llm/GroqClient.ts";
import { Hunk } from "@/services/content/graph/Hunk.ts";
import React from "react";

export class SuccessivePattern extends BaseNode {
  declare node: SuccessivePatternJson;

  constructor(node: SuccessivePatternJson) {
    super(node);
  }

  getSequence(nodesStore: NodesStore) {
    const head = nodesStore.getNodeById(this.node.headId);
    const sequence = [head];

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
      sequence.push(next);
    }

    return sequence;
  }

  // TODO: check prompts
  promptTemplates = {
    base: (sequence: BaseNode[], nodesStore: NodesStore) => {
      const sequenceContents = sequence.map((node) => {
        const hunkNode = node as Hunk;
        const hunk = hunkNode.getHunk(nodesStore);

        let result = hunkNode.promptTemplates.base(nodesStore);
        if (hunk.src) {
          result = `
---
${result}
---`;
        }

        return result;
      });
      return sequenceContents.join("\n");
    },
    description: (sequence: BaseNode[], nodesStore: NodesStore) => {
      let result = this.promptTemplates.base(sequence, nodesStore);

      result += `
As a review assistant, your task is to help the reviewer understand the purpose of this code by describing all evident intentions behind it.`;

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
