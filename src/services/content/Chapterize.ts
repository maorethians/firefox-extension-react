import { NodesStore } from "@/services/content/NodesStore.ts";

export type Chapter = {
  nodeId: string;
  subStory: Chapter[];
  represents?: string[];
};

export class Chapterize {
  private nodesStore: NodesStore;

  constructor(nodesStore: NodesStore) {
    this.nodesStore = nodesStore;
  }

  private getRequirementRoots = (story: Chapter[]) =>
    story.filter((chapter) => {
      const { node } = this.nodesStore.getNodeById(chapter.nodeId);

      if (node.nodeType !== "USAGE") {
        // Does it represent a requirement root?
        return chapter.represents
          ?.map((nodeId) => this.nodesStore.getNodeById(nodeId))
          .some(({ node }) => node.nodeType === "USAGE");
      }

      // Is it a requirement root?
      const aggregators = node.aggregatorIds.map((aggregatorId) =>
        this.nodesStore.getNodeById(aggregatorId),
      );
      return aggregators.every(
        (aggregator) => aggregator.node.nodeType !== "USAGE",
      );
    });

  private getCommonNodesRoots = (story: Chapter[]) =>
    story.filter((chapter) => {
      const { node } = this.nodesStore.getNodeById(chapter.nodeId);

      if (node.nodeType !== "COMPONENT") {
        return false;
      }

      if (node.reasonType !== "COMMON") {
        return false;
      }

      const reasonNodes = node.reasons.map((reason) =>
        this.nodesStore.getNodeById(reason.id),
      );
      return !reasonNodes.some(
        (node) =>
          node.nodeType === "LOCATION_CONTEXT" ||
          node.nodeType === "SEMANTIC_CONTEXT",
      );
    });

  private getSimilarNodesRoots = (story: Chapter[]) =>
    story.filter((chapter) => {
      const { node } = this.nodesStore.getNodeById(chapter.nodeId);

      if (node.nodeType !== "COMPONENT") {
        return false;
      }

      return node.reasonType === "SIMILAR";
    });

  private getCommonContextRoots = (story: Chapter[]) =>
    story.filter((chapter) => {
      const { node } = this.nodesStore.getNodeById(chapter.nodeId);

      if (node.nodeType !== "COMPONENT") {
        return false;
      }

      if (node.reasonType !== "COMMON") {
        return false;
      }

      const reasonNodes = node.reasons.map((reason) =>
        this.nodesStore.getNodeById(reason.id),
      );
      return reasonNodes.every(
        (node) =>
          node.nodeType === "LOCATION_CONTEXT" ||
          node.nodeType === "SEMANTIC_CONTEXT",
      );
    });

  private getPruneRootsSubNodeIds(story: Chapter[], pruneRoots: Chapter[]) {
    const pruneRootSubNodeIds: Record<string, string[]> = {};

    for (const { nodeId } of pruneRoots) {
      const subNodeIds: string[] = [];

      let hopNodeIds = [nodeId];
      while (true) {
        const nextHopNodeIds = hopNodeIds
          .map((nodeId) => this.nodesStore.getSourceEdges(nodeId))
          .flat()
          .filter(({ type }) => type === "EXPANSION")
          .map(({ targetId }) => targetId)
          .filter((nodeId) => !subNodeIds.includes(nodeId));
        if (nextHopNodeIds.length === 0) {
          break;
        }

        subNodeIds.push(...nextHopNodeIds);
        hopNodeIds = nextHopNodeIds;
      }

      pruneRootSubNodeIds[nodeId] = story
        // ordered subStory
        .filter((chapter) => subNodeIds.includes(chapter.nodeId))
        .map((chapter) => chapter.nodeId);
    }

    return pruneRootSubNodeIds;
  }

  private pruneRoots = (
    story: Chapter[],
    rootsSubNodeIds: Record<string, string[]>,
  ) => {
    let validRootsSubNodeIds = rootsSubNodeIds;
    if (Object.keys(rootsSubNodeIds).length === 0) {
      validRootsSubNodeIds = this.getPruneRootsSubNodeIds(story, [
        story[story.length - 1],
      ]);
    }

    const allSubNodeIds: string[] = [];

    for (const [rootId, subNodeIds] of Object.entries(validRootsSubNodeIds)) {
      const chapter = story.find(({ nodeId }) => nodeId === rootId);
      if (!chapter) {
        continue;
      }

      chapter.subStory = story.filter(({ nodeId }) =>
        subNodeIds.includes(nodeId),
      );

      allSubNodeIds.push(...subNodeIds);
    }

    return story.filter((chapter) => !allSubNodeIds.includes(chapter.nodeId));
  };

  getPrunedStories(story: Chapter[]) {
    const requirementRoots = this.getRequirementRoots(story);
    const requirementRootsSubNodeIds = this.getPruneRootsSubNodeIds(
      story,
      requirementRoots,
    );
    const requirementsStory = this.pruneRoots(
      story,
      requirementRootsSubNodeIds,
    );

    const commonNodesRoots = this.getCommonNodesRoots(story);
    const commonNodesRootsSubNodeIds = this.getPruneRootsSubNodeIds(
      story,
      commonNodesRoots,
    );
    const commonStory = this.pruneRoots(story, commonNodesRootsSubNodeIds);

    const similarNodesRoots = this.getSimilarNodesRoots(story);
    const similarNodesRootsSubNodeIds = this.getPruneRootsSubNodeIds(
      story,
      similarNodesRoots,
    );
    const similarStory = this.pruneRoots(story, similarNodesRootsSubNodeIds);

    const commonContextRoots = this.getCommonContextRoots(story);
    const commonContextRootsSubNodeIds = this.getPruneRootsSubNodeIds(
      story,
      commonContextRoots,
    );
    const contextStory = this.pruneRoots(story, commonContextRootsSubNodeIds);

    return {
      requirementsStory,
      commonStory,
      similarStory,
      contextStory,
    };
  }
}
