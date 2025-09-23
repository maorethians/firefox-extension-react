import { compact, last, partition } from "lodash";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { isAggregator } from "@/types";
import { useSubjectId } from "@/services/content/useSubjectId.ts";
import { Chapter, Chapterize } from "@/services/content/Chapterize.ts";
import { useStoryGranularity } from "@/services/content/useStoryGranularity.ts";
import { useSubjectChapter } from "@/services/content/useSubjectChapter.ts";

export class Narrator {
  private nodesStore: NodesStore;

  private baseStory: Chapter[] = [];
  readonly availableStories: Chapter[][];

  activeStory: Chapter[];

  constructor(nodesStore: NodesStore) {
    this.nodesStore = nodesStore;

    const rootNode = this.nodesStore.getNodeById("root");
    if (!rootNode) {
      throw new Error("Could not find root node");
    }

    const stack = [rootNode.node.id];
    this.dfs(stack);

    const {
      requirementsStory,
      commonHunksStory,
      similarStory,
      commonNodesStory,
    } = new Chapterize(this.nodesStore).getPrunedStories(this.baseStory);
    this.availableStories = compact([
      commonNodesStory,
      similarStory,
      commonHunksStory,
      requirementsStory,
      this.baseStory,
    ]);

    this.activeStory = this.baseStory;
  }

  private dfs = (stack: string[]) => {
    if (stack.length === 0) {
      return;
    }

    const subjectId = last(stack)!;
    if (this.baseStory.some((chapter) => chapter.nodeId === subjectId)) {
      return;
    }

    const subNodes = this.nodesStore
      .getSourceEdges(subjectId)
      .filter(({ type }) => type === "EXPANSION")
      .map(({ targetId }) => this.nodesStore.getNodeById(targetId));

    const subAggregatorNodes = subNodes.filter(
      ({ node }) =>
        isAggregator(node) &&
        this.baseStory.every((chapter) => chapter.nodeId !== node.id) &&
        stack.every((stackNodeId) => stackNodeId !== node.id),
    );
    const depthSortedIds = subAggregatorNodes
      .map(({ node }) => ({
        id: node.id,
        depth: this.nodesStore.getNodeBranches(node.id),
      }))
      .sort((a, b) => b.depth - a.depth)
      .map(({ id }) => id);
    for (const id of depthSortedIds) {
      stack.push(id);
      this.dfs(stack);
    }

    const chapter: Chapter = {
      nodeId: subjectId,
      subStory: [],
    };

    if (subNodes.length === 1 && isAggregator(subNodes[0].node)) {
      const subNodeId = subNodes[0].node.id;
      const [subNodeChapters, restStory] = partition(
        this.baseStory,
        (chapter) => chapter.nodeId === subNodeId,
      );

      this.baseStory = restStory;

      const subNodeChapter = subNodeChapters[0];
      if (subNodeChapter) {
        chapter.represents = [
          subNodeChapter.nodeId,
          ...(subNodeChapter.represents ?? []),
        ];
      }
    }

    this.baseStory.push(chapter);

    stack.pop();
  };

  updateActiveStory() {
    const subjectChapter = useSubjectChapter.getState().chapter;
    if (subjectChapter) {
      this.activeStory = subjectChapter.subStory;
      return;
    }

    const storyGranularity = useStoryGranularity.getState().storyGranularity;
    this.activeStory = this.availableStories[storyGranularity];
  }

  previous = () => {
    const currentIndex = this.currentIndex();
    const previousIndex = Math.max(0, currentIndex - 1);
    this.goto(previousIndex);
  };

  next = () => {
    const currentIndex = this.currentIndex();
    const nextIndex = Math.min(this.baseStory.length - 1, currentIndex + 1);
    this.goto(nextIndex);
  };

  goto = (index: number) => {
    useSubjectId.getState().setSubjectId(this.activeStory[index].nodeId);
  };

  currentIndex = () => {
    const index = this.activeStory.findIndex(
      (chapter) => chapter.nodeId === useSubjectId.getState().subjectId,
    );
    if (index !== -1) {
      return index;
    }

    // TODO: find relevant index and set subject
    const availableIndex = this.activeStory.length - 1;
    useSubjectId
      .getState()
      .setSubjectId(this.activeStory[availableIndex].nodeId);
    return availableIndex;
  };

  currentChapter = () => {
    const currentIndex = this.currentIndex();
    return this.activeStory[currentIndex];
  };
}
