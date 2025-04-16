import { Dictionary, keyBy, last } from "lodash";
import { Commit, Edge, Node } from "@/types";
import { SUBJECT_MESSAGE_TYPE } from "@/components/SubjectNode.tsx";

export class Narrator {
  nodesDictionary: Dictionary<Node>;
  narrate: string[];
  current: string | null = null;

  constructor(commit: Commit) {
    this.nodesDictionary = keyBy(commit.nodes, "id");

    const commitNode = this.nodesDictionary["commit"];
    if (!commitNode) {
      throw new Error("Could not find commit node");
    }

    const visited: string[] = [],
      stack = [commitNode.id];
    this.dfs(commit.edges, visited, stack);

    this.narrate = visited;

    window.addEventListener("message", ({ data }: MessageEvent) => {
      if (data.type !== SUBJECT_MESSAGE_TYPE) {
        return;
      }

      const { subjectId } = data.data;
      this.current = subjectId;
    });
  }

  private dfs = (edges: Edge[], visited: string[], stack: string[]) => {
    if (stack.length === 0) {
      return;
    }

    const subjectId = last(stack)!;

    const targetNodes = edges
      .filter(
        (edge) => edge.type === "EXPANSION" && edge.sourceId === subjectId,
      )
      .map((edge) => this.nodesDictionary[edge.targetId])
      .filter(
        (node) =>
          node &&
          node.nodeType === "AGGREGATOR" &&
          !visited.includes(node.id) &&
          !stack.includes(node.id),
      );
    for (const targetNode of targetNodes) {
      stack.push(targetNode.id);
      this.dfs(edges, visited, stack);
    }

    visited.push(subjectId);
    stack.pop();
  };

  beginStory = () => {
    this.postMessage(this.narrate[0]);
  };

  previousChapter = () => {
    const currentIndex = this.narrate.findIndex((id) => id === this.current);
    const previousIndex = Math.max(0, currentIndex - 1);
    this.postMessage(this.narrate[previousIndex]);
  };

  nextChapter = () => {
    const currentIndex = this.narrate.findIndex((id) => id === this.current);
    const nextIndex = Math.min(this.narrate.length - 1, currentIndex + 1);
    this.postMessage(this.narrate[nextIndex]);
  };

  private postMessage = (subjectId: string) => {
    window.postMessage({
      type: SUBJECT_MESSAGE_TYPE,
      data: { subjectId },
    });
  };
}
