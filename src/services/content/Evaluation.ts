// duplicate eval
// url - hierarchy - narration

import {
  Eval,
  StorageEvaluation,
  useEvaluation,
} from "@/services/content/useEvaluation.ts";
import { StorageKey } from "@/services/StorageKey.ts";
import { EdgeType, Hierarchy, NodeType } from "@/types";
import { Narrator } from "@/services/content/Narrator.ts";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { Chapter } from "@/services/content/Chapterize.ts";

const EVALUATION_STORAGE_KEY: StorageItemKey =
  "local:changeNarrator:evaluation";

export type ExportedEvaluation = Record<
  string,
  {
    nodes: {
      id: string;
      description?: string;
      title?: string;
      type: NodeType;
    }[];
    edges: {
      source: string;
      target: string;
      type: EdgeType;
    }[];
    story: Chapter[];
    evaluations: StorageEvaluation;
  }
>;

export class Evaluation {
  private readonly url: string;

  constructor(url: string) {
    this.url = url;
  }

  async populateFromStorage() {
    const storageEvaluation = (await storage.getItem(
      EVALUATION_STORAGE_KEY,
    )) as Record<string, StorageEvaluation>;
    if (!storageEvaluation) {
      return;
    }

    if (!storageEvaluation[this.url]) {
      return;
    }

    useEvaluation.getState().setEvaluation(storageEvaluation[this.url]);
  }

  async evalNode(id: string, value: Eval) {
    useEvaluation.getState().evalNode(id, value);
    await this.updateStorage();
  }

  private async updateStorage() {
    const storageEvaluation = ((await storage.getItem(
      EVALUATION_STORAGE_KEY,
    )) ?? {}) as Record<string, StorageEvaluation>;

    const evaluation = useEvaluation.getState().evaluation;
    await storage.setItem(EVALUATION_STORAGE_KEY, {
      ...storageEvaluation,
      [this.url]: evaluation,
    });
  }

  static async getExport(): Promise<ExportedEvaluation> {
    const storageEvaluation = (await storage.getItem(
      EVALUATION_STORAGE_KEY,
    )) as Record<string, StorageEvaluation>;
    if (!storageEvaluation) {
      return {};
    }

    const result: ExportedEvaluation = {};
    for (const [url, urlEvaluation] of Object.entries(storageEvaluation)) {
      const urlHierarchy = (await storage.getItem(
        StorageKey.hierarchy(url),
      )) as Hierarchy;
      if (!urlHierarchy) {
        continue;
      }

      const narrator = new Narrator(
        new NodesStore(url, {
          nodes: urlHierarchy.nodes,
          edges: urlHierarchy.edges,
        }),
      );

      result[url] = {
        nodes: urlHierarchy.nodes.map((node) => ({
          id: node.id,
          description: node.description,
          title: node.title,
          type: node.nodeType,
        })),
        edges: urlHierarchy.edges.map((edge) => ({
          source: edge.sourceId,
          target: edge.targetId,
          type: edge.type,
        })),
        story: narrator.activeStory,
        evaluations: urlEvaluation,
      };
    }

    return result;
  }
}
