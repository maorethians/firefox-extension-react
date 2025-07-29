import { groupBy, uniq } from "lodash";
import ReactDOM from "react-dom/client";
import React from "react";
import BPromise from "bluebird";
import { HunkElementWrapper } from "@/components/content/HunkElementWrapper.tsx";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { Hunk } from "@/services/content/graph/Hunk.ts";
import { UrlHelper } from "@/services/UrlHelper.ts";
import {
  SUBJECT_ID_MESSAGE,
  useSubjectId,
} from "@/services/content/useSubjectId.ts";
import {
  hunkHighlightTimeoutIds,
  useHunkHighlight,
} from "@/services/content/useHunkHighlight.ts";

type ClosenessType = "start" | "end";
type Direction = "up" | "down";

export class HunkLinesHandler {
  private readonly url: string;
  private isCommit: boolean;
  private isPullRequest: boolean;
  private isPRCommit: boolean;
  private readonly nodesStore: NodesStore;
  private activeHunksLines: Record<
    string,
    Record<
      number,
      {
        element: Element;
        placeholder: Element;
      }[]
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
  private getInnerTextWrapper = {
    commit: (td: Element) => {
      const codeLine = td.querySelector("code");
      if (!codeLine) {
        return;
      }

      return codeLine.getElementsByClassName("diff-text-inner").item(0);
    },
    pullRequest: (td: Element) => {
      return td.classList.contains("blob-code-inner")
        ? td
        : td.getElementsByClassName("blob-code-inner").item(0);
    },
  };

  constructor(url: string, nodesStore: NodesStore) {
    this.url = url;
    this.isCommit = UrlHelper.isCommit(url);
    this.isPullRequest = UrlHelper.isPullRequest(url);
    this.isPRCommit = UrlHelper.isPRCommit(url);
    this.nodesStore = nodesStore;
  }

  async init() {
    if (this.isCommit) {
      this.populateTableMap.commit();
    }

    if (this.isPRCommit || this.isPullRequest) {
      await this.populateTableMap.pullRequest();
    }

    this.removeDefaultBackground(
      Object.values(this.fileDiffTable)
        .map((fileRows) => Array.from(fileRows.children))
        .flat(),
    );

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
    const lines = Object.values(this.activeHunksLines)
      .map((hunkLines) => Object.values(hunkLines))
      .flat()
      .flat();
    for (const { element, placeholder } of lines) {
      placeholder.parentElement?.replaceChild(element, placeholder);
    }

    this.activeHunksLines = {};
  }

  private async injectSubjectLines() {
    const { firstGeneration, extendedGenerations } =
      this.nodesStore.getDescendantHunks(useSubjectId.getState().subjectId);

    await this.injectGenerationLines(firstGeneration, 1);
    await this.injectGenerationLines(extendedGenerations, 0.45);

    this.updateScrollList();
    this.scrollIndex =
      this.scrollLists[useSubjectId.getState().subjectId].length - 1;
  }

  private async injectGenerationLines(generation: Hunk[], strength: number) {
    for (const hunk of generation) {
      await this.injectHunkLines(hunk, strength);
    }
  }

  private async injectHunkLines(hunk: Hunk, strength: number) {
    const {
      id,
      startLine,
      startLineOffset,
      endLine,
      endLineOffset,
      path,
      dsts,
    } = hunk.node;
    if (this.activeHunksLines[id]) {
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
        element: Element;
        placeholder: Element;
      }[]
    > = {};
    for (const [lineNumberStr, line] of Object.entries(lines)) {
      const lineNumber = parseInt(lineNumberStr);

      let innerTextWrapper;
      if (this.isCommit) {
        innerTextWrapper = this.getInnerTextWrapper.commit(line);
      }
      if (this.isPRCommit || this.isPullRequest) {
        innerTextWrapper = this.getInnerTextWrapper.pullRequest(line);
      }

      if (!innerTextWrapper) {
        continue;
      }

      // wrap any text with span
      let currentChild = innerTextWrapper.firstChild;
      while (currentChild) {
        if (currentChild.nodeType === Node.TEXT_NODE) {
          const wrapper = document.createElement("span");
          wrapper.textContent = currentChild.textContent;
          innerTextWrapper.replaceChild(wrapper, currentChild);

          currentChild = wrapper;
        }

        currentChild = currentChild.nextSibling;
      }

      linePlaceholder[lineNumber] = [];

      currentChild = innerTextWrapper.firstChild;
      let lineOffset = 0;
      while (currentChild) {
        const childElement = currentChild as HTMLElement;

        const isInHunk = this.isInRange(
          { lineNumber, lineOffset },
          {
            startLine,
            startLineOffset,
            endLine,
            endLineOffset,
          },
        );
        const isException = dsts?.some((dst) =>
          this.isInRange({ lineNumber, lineOffset }, dst),
        );

        if (isInHunk || isException) {
          const component = React.createElement(HunkElementWrapper, {
            nodesStore: this.nodesStore,
            hunkId: id,
            element: childElement.cloneNode(true) as HTMLElement,
            strength,
            type: isException ? "MOVED" : "ADDITION",
          });
          const placeholder = document.createElement("span");
          childElement.parentElement?.replaceChild(placeholder, childElement);
          const root = ReactDOM.createRoot(placeholder);
          root.render(component);

          linePlaceholder[lineNumber].push({
            element: childElement,
            placeholder,
          });

          currentChild = placeholder;
        }

        currentChild = currentChild.nextSibling;

        const childContent = childElement.innerText;
        lineOffset += childContent.length;
      }
    }

    this.activeHunksLines[id] = linePlaceholder;
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
      useSubjectId.getState().subjectId,
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
    const orderedHunkIds = uniq(orderedHunks.map((hunk) => hunk.node.id));

    const scrollList = orderedHunkIds
      .map((hunkId) =>
        Object.entries(this.activeHunksLines[hunkId]).map(
          ([lineNumber, line]) => ({
            lineNumber: parseInt(lineNumber),
            placeholders: line.map(({ placeholder }) => placeholder),
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
          element: numberElements[minIndex].placeholders[0],
          hunkId: numberElements[minIndex].hunkId,
        };
      });

    this.scrollLists[useSubjectId.getState().subjectId] = scrollList;

    return scrollList;
  };

  scroll = () => {
    const scrollList = this.scrollLists[useSubjectId.getState().subjectId];
    this.scrollIndex =
      this.scrollIndex === scrollList.length - 1 ? 0 : this.scrollIndex + 1;

    const { element, hunkId } = scrollList[this.scrollIndex];
    element.scrollIntoView({ behavior: "smooth", block: "center" });

    const setHunkHighlight = useHunkHighlight.getState().setHunkHighlight;
    setHunkHighlight(hunkId, true);

    hunkHighlightTimeoutIds[hunkId] = setTimeout(() => {
      setHunkHighlight(hunkId, false);
    }, 1000);
  };

  private isInRange(
    { lineNumber, lineOffset }: { lineNumber: number; lineOffset: number },
    {
      startLine,
      startLineOffset,
      endLine,
      endLineOffset,
    }: {
      startLine: number;
      startLineOffset: number;
      endLine: number;
      endLineOffset: number;
    },
  ) {
    return (
      (lineNumber > startLine && lineNumber < endLine) ||
      (lineNumber === startLine &&
        lineNumber !== endLine &&
        lineOffset >= startLineOffset) ||
      (lineNumber === endLine &&
        lineNumber !== startLine &&
        lineOffset < endLineOffset) ||
      (lineNumber === startLine &&
        lineNumber === endLine &&
        lineOffset >= startLineOffset &&
        lineOffset < endLineOffset)
    );
  }

  private removeDefaultBackground(rows: Element[]) {
    for (const row of rows) {
      let column = row.firstElementChild;
      while (column) {
        (column as HTMLElement).style.removeProperty("background-color");
        (column as HTMLElement).classList.remove(
          "blob-num-deletion",
          "blob-code-deletion",
          "blob-num-addition",
          "blob-code-addition",
        );
        column = column.nextElementSibling;
      }
    }
  }
}
