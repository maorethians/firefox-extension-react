import { groupBy, uniq } from "lodash";
import ReactDOM from "react-dom/client";
import React from "react";
import BPromise from "bluebird";
import { HunkLineWrapper } from "@/components/content/HunkLineWrapper.tsx";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { Hunk } from "@/services/content/graph/Hunk.ts";
import { isHunk } from "@/types";
import { UrlHelper } from "@/services/UrlHelper.ts";
import { useColorMode } from "@/services/content/useColorMode.ts";
import {
  SUBJECT_ID_MESSAGE,
  useSubjectId,
} from "@/services/content/useSubjectId.ts";

type ClosenessType = "start" | "end";
type Direction = "up" | "down";

export class HunkLinesHandler {
  private readonly url: string;
  private readonly nodesStore: NodesStore;
  private currentLines: Record<
    string,
    Record<
      number,
      {
        line: Element;
        placeholder: Element;
      }
    >
  > = {};
  private fileDiffTable: Record<string, HTMLTableSectionElement> = {};
  private fileDiffTableOrder: Record<string, number> = {};
  private scrollLists: Record<string, { element: Element; hunkId: string }[]> =
    {};
  private scrollIndex = -1;

  private populateTableMap = {
    // commit unified/split
    commit: () => {
      const diffContentParent = document.getElementById("diff-content-parent");
      if (!diffContentParent) {
        return;
      }

      let fileDiffParent =
        diffContentParent?.firstElementChild?.firstElementChild;
      let fileIndex = 0;
      while (true) {
        fileDiffParent = fileDiffParent?.nextElementSibling;
        if (!fileDiffParent) {
          break;
        }

        const fileDiff = fileDiffParent.firstElementChild;
        if (!fileDiff) {
          continue;
        }

        const filePathSection = fileDiff.children.item(0)?.firstElementChild;
        if (!filePathSection) {
          continue;
        }
        const filePathButton = filePathSection.querySelector("button");
        const filePathWrapper = filePathButton?.nextElementSibling;
        const filePathElement =
          filePathWrapper?.firstElementChild?.firstElementChild
            ?.firstElementChild;
        if (!filePathElement) {
          continue;
        }

        const filePath = filePathElement.innerHTML?.replace(
          /[\u200E\u200F\u202A-\u202E\uFEFF]/g,
          "",
        );
        if (!filePath) {
          continue;
        }

        const diffSection = fileDiff.children.item(1);
        if (!diffSection) {
          continue;
        }
        const diffTable = diffSection.querySelectorAll("table").item(0);
        if (!diffTable) {
          continue;
        }

        this.fileDiffTable[filePath] = diffTable
          .querySelectorAll("tbody")
          .item(0);
        this.fileDiffTableOrder[filePath] = fileIndex++;
      }
    },
    // PR-PR commit unified/split
    pullRequest: async () => {
      const filesContainersParent = document.getElementById("files");
      if (!filesContainersParent) {
        return;
      }

      const filesContainers = Array.from(filesContainersParent.children).filter(
        (child) => child.classList.contains("js-diff-progressive-container"),
      );
      for (const container of filesContainers) {
        while (true) {
          const probChild = container.firstElementChild;
          if (
            probChild === null ||
            probChild.tagName === "COPILOT-DIFF-ENTRY"
          ) {
            break;
          }

          await BPromise.delay(100);
        }
      }

      const files = filesContainers
        .map((container) => Array.from(container.children))
        .flat();
      let fileIndex = 0;
      for (const file of files) {
        const filePath = file.getAttribute("data-file-path");
        if (!filePath) {
          continue;
        }

        const diffTable = file.firstElementChild?.children
          .item(1)
          ?.firstElementChild?.querySelectorAll("table")
          .item(0);
        if (!diffTable) {
          // TODO: Load Diff
          continue;
        }

        this.fileDiffTable[filePath] = diffTable
          .querySelectorAll("tbody")
          .item(0);
        this.fileDiffTableOrder[filePath] = fileIndex++;
      }
    },
  };

  constructor(url: string, nodesStore: NodesStore) {
    this.url = url;
    this.nodesStore = nodesStore;
  }

  async init() {
    if (UrlHelper.isCommit(this.url)) {
      this.populateTableMap.commit();
    }

    if (UrlHelper.isPRCommit(this.url) || UrlHelper.isPullRequest(this.url)) {
      await this.populateTableMap.pullRequest();
    }

    const subjectNode = this.nodesStore.getNodeById("root");
    if (!subjectNode) {
      return;
    }
    await this.injectSubjectLines();

    window.addEventListener("message", async ({ data }: MessageEvent) => {
      if (data.type !== SUBJECT_ID_MESSAGE) {
        return;
      }

      this.revertCurrentLines();
      await this.injectSubjectLines();
    });
  }

  private revertCurrentLines() {
    const lines = Object.values(this.currentLines)
      .map((hunkLines) => Object.values(hunkLines))
      .flat();
    for (const { line, placeholder } of lines) {
      placeholder.parentElement?.replaceChild(line, placeholder);
    }

    this.currentLines = {};
  }

  private async injectSubjectLines() {
    const subjectNode = this.nodesStore.getNodeById(
      useSubjectId.getState().subjectId,
    );

    const { firstGeneration, extendedGenerations } =
      this.nodesStore.getDescendantHunks(subjectNode);

    await this.injectGenerationLines(firstGeneration, 0.6);
    await this.injectGenerationLines(extendedGenerations, 0.2);

    this.updateScrollList();
    this.scrollIndex = -1;
  }

  private async injectGenerationLines(generation: Hunk[], strength: number) {
    const hunkIds = uniq(generation.map(({ node }) => node.hunkId));
    const hunks = this.nodesStore
      .getNodes()
      .filter(
        ({ node }) => isHunk(node) && hunkIds.includes(node.hunkId),
      ) as Hunk[];
    const groupedHunks = Object.values(
      groupBy(hunks, ({ node }) => node.hunkId),
    );

    for (const hunk of groupedHunks) {
      await this.injectHunkLines(hunk, strength);
    }
  }

  private async injectHunkLines(hunk: Hunk[], strength: number) {
    const { startLine, endLine, path, hunkId } = hunk[0].node;
    if (this.currentLines[hunkId]) {
      return;
    }

    const { closestRow, closenessType } = this.getClosestRow(
      Array.from(this.fileDiffTable[path].children),
      startLine,
      endLine,
    );

    if (!closestRow || !closenessType) {
      return;
    }

    const lines: Record<number, Element> = {};
    const hunkLength = endLine - startLine + 1;
    let currentRow = closestRow;
    while (true) {
      const rowInfo = this.getRowInfo(currentRow);
      if (!rowInfo) {
        break;
      }

      if (
        rowInfo.rightLineNumber &&
        startLine <= rowInfo.rightLineNumber &&
        rowInfo.rightLineNumber <= endLine
      ) {
        lines[rowInfo.rightLineNumber] = rowInfo.right;
      }

      if (Object.keys(lines).length === hunkLength) {
        break;
      }

      const direction = closenessType === "start" ? "down" : "up";
      await this.expandRow(currentRow, direction);

      const nextRow = this.getNextRow(currentRow, direction);
      if (!nextRow) {
        break;
      }

      currentRow = nextRow;
    }

    if (Object.keys(lines).length === 0) {
      return;
    }

    const linePlaceholder: Record<
      number,
      {
        line: Element;
        placeholder: Element;
      }
    > = {};
    for (const [lineNumber, line] of Object.entries(lines)) {
      const component = React.createElement(HunkLineWrapper, {
        nodesStore: this.nodesStore,
        hunk,
        element: line.cloneNode(true) as HTMLElement,
        strength,
        hunkLinesHandler: this,
      });

      const placeholder = document.createElement("div");
      line.parentElement?.replaceChild(placeholder, line);
      const root = ReactDOM.createRoot(placeholder);
      root.render(component);

      linePlaceholder[parseInt(lineNumber)] = { line, placeholder };
    }

    this.currentLines[hunkId] = linePlaceholder;
  }

  private getRowInfo(row?: Element | null) {
    if (!row) {
      return;
    }

    const right = row.lastElementChild;
    if (!right) {
      return;
    }

    const rightLineContainer = right.previousElementSibling;
    if (!rightLineContainer) {
      return { right };
    }

    const rightLineNumber =
      rightLineContainer.getAttribute("data-line-number") ??
      rightLineContainer.firstElementChild?.innerHTML;
    if (!rightLineNumber) {
      return { right };
    }

    return { right, rightLineNumber: parseInt(rightLineNumber, 10) };
  }

  private async expandRow(row: Element, direction: Direction) {
    const nextRow = this.getNextRow(row, direction);
    if (!nextRow) {
      return;
    }

    // TODO: it only works for pull request
    if (!nextRow.classList.contains("js-expandable-line")) {
      return;
    }

    const expansionContainer = nextRow
      .getElementsByClassName("blob-num-expandable")
      .item(0);
    if (!expansionContainer) {
      return;
    }

    const expansionLinks = expansionContainer.getElementsByTagName("a");
    switch (expansionLinks.length) {
      case 0:
        return;
      case 1:
        expansionLinks.item(0)?.click();
        return;
      case 2:
        direction === "down"
          ? expansionLinks.item(0)?.click()
          : expansionLinks.item(1)?.click();
    }

    await this.waitForExpansion(row, direction);
  }

  private async waitForExpansion(row: Element, direction: Direction) {
    while (true) {
      const nextRow = this.getNextRow(row, direction);
      const rowInfo = this.getRowInfo(nextRow);
      if (rowInfo) {
        break;
      }
      await BPromise.delay(100);
    }
  }

  private getClosestRow(rows: Element[], start: number, end: number) {
    let closestRow: Element | null = null;
    let closenessType: ClosenessType | null = null;

    let closestDistance = rows.length;
    for (const row of rows) {
      const rowInfo = this.getRowInfo(row);
      if (!rowInfo || !rowInfo.rightLineNumber) {
        continue;
      }

      const startDistance = Math.abs(rowInfo.rightLineNumber - start);
      const endDistance = Math.abs(rowInfo.rightLineNumber - end);
      const minDistance = Math.min(startDistance, endDistance);
      if (minDistance < closestDistance) {
        closestRow = row;
        closestDistance = minDistance;
        closenessType = startDistance <= endDistance ? "start" : "end";
      }

      if (closestDistance === 0 && closenessType === "start") {
        break;
      }
    }

    return { closestRow, closenessType };
  }

  private getNextRow(currentRow: Element, direction: Direction) {
    return direction === "down"
      ? currentRow.nextElementSibling
      : currentRow.nextElementSibling;
  }

  private updateScrollList = () => {
    const { firstGeneration } = this.nodesStore.getDescendantHunks(
      this.nodesStore.getNodeById(useSubjectId.getState().subjectId),
    );
    const fileOrderedHunks = Object.entries(
      groupBy(
        firstGeneration.map((hunk) => ({
          ...hunk,
          fileOrder: this.fileDiffTableOrder[hunk.node.path],
        })),
        "fileOrder",
      ),
    );
    const orderedHunks = fileOrderedHunks
      .map(
        ([fileOrder, hunks]) =>
          [
            parseInt(fileOrder),
            hunks.sort((h1, h2) => h1.node.startLine - h2.node.startLine),
          ] as const,
      )
      .sort((e1, e2) => e1[0] - e2[0])
      .map(([_fileOrder, hunks]) => hunks)
      .flat();
    const orderedHunkIds = uniq(orderedHunks.map((hunk) => hunk.node.hunkId));

    const scrollList = orderedHunkIds
      .map((hunkId) =>
        Object.entries(this.currentLines[hunkId]).map(
          ([lineNumber, linePlaceholder]) => ({
            lineNumber: parseInt(lineNumber),
            placeholder: linePlaceholder.placeholder,
            hunkId,
          }),
        ),
      )
      .map((numberElements) => {
        let minIndex = 0;
        let minNumber = numberElements[minIndex].lineNumber;
        numberElements.forEach(({ lineNumber }, index) => {
          if (lineNumber < minNumber) {
            minNumber = lineNumber;
            minIndex = index;
          }
        });

        return {
          element: numberElements[minIndex].placeholder,
          hunkId: numberElements[minIndex].hunkId,
        };
      });

    this.scrollLists[useSubjectId.getState().subjectId] = scrollList;

    return scrollList;
  };

  scrollNext = () => {
    const scrollList = this.scrollLists[useSubjectId.getState().subjectId];
    this.scrollIndex = Math.min(scrollList.length - 1, this.scrollIndex + 1);

    const { element, hunkId } = scrollList[this.scrollIndex];
    element.scrollIntoView({ behavior: "smooth", block: "center" });

    this.highlightHunk(hunkId);
  };

  scrollPrevious = () => {
    const scrollList = this.scrollLists[useSubjectId.getState().subjectId];
    this.scrollIndex = Math.max(0, this.scrollIndex - 1);

    const { element, hunkId } = scrollList[this.scrollIndex];
    element.scrollIntoView({ behavior: "smooth", block: "center" });

    this.highlightHunk(hunkId);
  };

  highlightHunk = (hunkId: string) => {
    const colorMode = useColorMode.getState().colorMode;
    const classPostFix = colorMode.toLowerCase();

    const linePlaceholders = this.currentLines[hunkId];
    Object.values(linePlaceholders).forEach(({ placeholder }) => {
      const children = Array.from(placeholder.children);

      for (const child of children) {
        child.classList.add(`highlight-${classPostFix}`);
      }

      setTimeout(() => {
        for (const child of children) {
          child.classList.remove(`highlight-${classPostFix}`);
        }
      }, 1200);
    });
  };
}
