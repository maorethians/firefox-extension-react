import { groupBy } from "lodash";
import ReactDOM from "react-dom/client";
import React from "react";
import BPromise from "bluebird";
import { InnerTextWrapper } from "@/components/content/InnerTextWrapper.tsx";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { Hunk } from "@/services/content/graph/Hunk.ts";
import { UrlHelper } from "@/services/UrlHelper.ts";
import {
  SUBJECT_ID_MESSAGE,
  useSubjectId,
} from "@/services/content/useSubjectId.ts";
import { Range } from "@/types";
import {
  InnerTextState,
  rangeTimeouts,
  useInnerTextState,
} from "@/services/content/useInnerTextState.ts";

type ClosenessType = "start" | "end";
type Direction = "up" | "down";

export class RangeHandler {
  private readonly type: "Commit" | "PullRequest" | "PRCommit" | null = null;
  private readonly nodesStore: NodesStore;

  private fileDiffTable: Record<string, HTMLTableSectionElement> = {};
  private fileOrder: Record<string, number> = {};
  private lines: Record<string, Element> = {};

  private injectedInnerTexts: Record<
    string,
    {
      element: HTMLElement;
      placeholder: Element;
      path: string;
      lineNumber: number;
      lineOffset: number;
    }
  > = {};
  private subjectOrderedHunks: Record<string, Hunk[]> = {};
  private scrollIndex = 0;

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
        this.fileOrder[filePath] = fileIndex++;
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
        this.fileOrder[filePath] = fileIndex++;
      }
    },
  };
  private innerTextWrapper = {
    commit: (line: Element) => {
      const codeLine = line.querySelector("code");
      if (!codeLine) {
        return;
      }

      return codeLine.getElementsByClassName("diff-text-inner").item(0);
    },
    pullRequest: (line: Element) => {
      return line.classList.contains("blob-code-inner")
        ? line
        : line.getElementsByClassName("blob-code-inner").item(0);
    },
  };

  constructor(url: string, nodesStore: NodesStore) {
    if (UrlHelper.isCommit(url)) {
      this.type = "Commit";
    }
    if (UrlHelper.isPullRequest(url)) {
      this.type = "PullRequest";
    }
    if (UrlHelper.isPRCommit(url)) {
      this.type = "PRCommit";
    }

    this.nodesStore = nodesStore;
  }

  async init() {
    switch (this.type) {
      case "Commit":
        this.populateTableMap.commit();
        break;
      case "PRCommit":
      case "PullRequest":
        await this.populateTableMap.pullRequest();
        break;
    }

    this.standardizeRows();

    await this.prepareLines();

    this.injectSubjectHunks();

    window.addEventListener("message", ({ data }: MessageEvent) => {
      if (data.type !== SUBJECT_ID_MESSAGE) {
        return;
      }

      this.flushInjections();
      this.injectSubjectHunks();

      this.scrollIndex = 0;
    });
  }

  static getInnerTextId = (
    path: string,
    lineNumber: number,
    lineOffset: number,
  ) => this.getLineId(path, lineNumber) + "-" + lineOffset;

  static getLineId = (path: string, lineNumber: number) =>
    `${path}-${lineNumber}`;

  static getRangeId = (path: string, range: Range) =>
    `${path}-${range.startLine}-${range.startLineOffset}-${range.endLine}-${range.endLineOffset}`;

  private getInnerTextWrapper = (line: Element): Element | null | undefined => {
    switch (this.type) {
      case "Commit":
        return this.innerTextWrapper.commit(line);
      case "PRCommit":
      case "PullRequest":
        return this.innerTextWrapper.pullRequest(line);
    }
  };

  private getRangeLines(path: string, startLine: number, endLine: number) {
    const lines: Record<number, Element> = {};
    for (let lineNumber = startLine; lineNumber <= endLine; lineNumber++) {
      lines[lineNumber] = this.lines[RangeHandler.getLineId(path, lineNumber)];
    }
    return lines;
  }

  flushInjections = () => {
    for (const [id, { element, placeholder }] of Object.entries(
      this.injectedInnerTexts,
    )) {
      placeholder.parentElement?.replaceChild(element, placeholder);
      useInnerTextState.getState().flushInnerTextState(id);
    }

    this.injectedInnerTexts = {};
  };

  injectRange(path: string, range: Range) {
    const lines = this.getRangeLines(path, range.startLine, range.endLine);
    if (!lines || Object.keys(lines).length === 0) {
      return;
    }

    for (const [lineNumberStr, line] of Object.entries(lines)) {
      const lineNumber = parseInt(lineNumberStr);

      const innerTextWrapper = this.getInnerTextWrapper(line);
      if (!innerTextWrapper) {
        continue;
      }

      let lineOffset = 0;
      for (const child of innerTextWrapper.children) {
        const innerTextId = RangeHandler.getInnerTextId(
          path,
          lineNumber,
          lineOffset,
        );

        const injected = this.injectedInnerTexts[innerTextId];
        if (injected) {
          lineOffset += injected.element.innerText.length;
          continue;
        }

        const element = child as HTMLElement;

        const isInRange = this.isInRange({ lineNumber, lineOffset }, range);
        if (isInRange) {
          const component = React.createElement(InnerTextWrapper, {
            innerTextId,
            nodesStore: this.nodesStore,
            element: element.cloneNode(true) as HTMLElement,
            addRangeState: (state) => this.addRangeState(path, range, state),
            removeRangeState: (state) =>
              this.removeRangeState(path, range, state),
          });
          const placeholder = document.createElement("span");
          element.parentElement?.replaceChild(placeholder, element);
          const root = ReactDOM.createRoot(placeholder);
          root.render(component);

          this.injectedInnerTexts[innerTextId] = {
            element,
            placeholder,
            path,
            lineNumber,
            lineOffset,
          };
        }

        lineOffset += element.innerText.length;
      }
    }
  }

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

  injectSubjectHunks() {
    const { firstGeneration, extendedGenerations } =
      this.nodesStore.getDescendantHunks(useSubjectId.getState().subjectId);
    for (const hunk of [...firstGeneration, ...extendedGenerations]) {
      this.injectRange(hunk.node.path, hunk.node);
    }

    for (const hunk of firstGeneration) {
      this.addRangeState(hunk.node.path, hunk.node, "strongAddition");
    }
    for (const hunk of extendedGenerations) {
      this.addRangeState(hunk.node.path, hunk.node, "weakAddition");
    }
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

    // TODO: provide only new rows
    this.standardizeRows();
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

  private getClosestRow(path: string, startLine: number, endLine: number) {
    const rows = Array.from(this.fileDiffTable[path].children);

    let closestRow: Element | null = null;
    let closenessType: ClosenessType | null = null;
    let closestDistance = rows.length;
    for (const row of rows) {
      const rowInfo = this.getRowInfo(row);
      if (!rowInfo || !rowInfo.rightLineNumber) {
        continue;
      }

      const startDistance = Math.abs(rowInfo.rightLineNumber - startLine);
      const endDistance = Math.abs(rowInfo.rightLineNumber - endLine);
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

  private getSubjectOrderedHunks = () => {
    const subjectId = useSubjectId.getState().subjectId;

    if (this.subjectOrderedHunks[subjectId]) {
      return this.subjectOrderedHunks[subjectId];
    }

    const { firstGeneration } = this.nodesStore.getDescendantHunks(
      useSubjectId.getState().subjectId,
    );
    const fileOrderHunks = groupBy(
      firstGeneration.map((hunk) => ({
        hunk,
        fileOrder: this.fileOrder[hunk.node.path],
      })),
      "fileOrder",
    );

    this.subjectOrderedHunks[subjectId] = Object.entries(fileOrderHunks)
      .map(
        ([fileOrder, hunks]) =>
          [
            parseInt(fileOrder),
            hunks.sort(
              ({ hunk: h1 }, { hunk: h2 }) =>
                h1.node.startLine - h2.node.startLine,
            ),
          ] as const,
      )
      .sort((e1, e2) => e1[0] - e2[0])
      .map(([_fileOrder, hunks]) => hunks.map(({ hunk }) => hunk))
      .flat();
    return this.subjectOrderedHunks[subjectId];
  };

  scrollRange = ({ path, ...range }: Range & { path: string }) => {
    this.injectRange(path, range);

    const lines = this.getRangeLines(path, range.startLine, range.endLine);
    if (!lines) {
      return;
    }
    const sortedLines = Object.entries(lines)
      .map(([lineNumber, line]) => ({
        lineNumber: parseInt(lineNumber),
        line,
      }))
      .sort((e1, e2) => e1.lineNumber - e2.lineNumber);
    const element = sortedLines[Math.floor(sortedLines.length / 2)].line;
    element.scrollIntoView({ behavior: "smooth", block: "center" });

    this.addRangeState(path, range, "highlight");
    // TODO: we should flush out of subject generations ranges
    rangeTimeouts[RangeHandler.getRangeId(path, range)] = setTimeout(() => {
      this.removeRangeState(path, range, "highlight");
    }, 1000);
  };

  scrollSubject = () => {
    const orderedHunks = this.getSubjectOrderedHunks();

    const scrollHunk = orderedHunks[this.scrollIndex];
    this.scrollRange(scrollHunk.node);

    this.scrollIndex =
      this.scrollIndex === orderedHunks.length - 1 ? 0 : this.scrollIndex + 1;
  };

  addRangeState = (path: string, range: Range, state: InnerTextState) => {
    const rangeId = RangeHandler.getRangeId(path, range);
    const availableTimeout = rangeTimeouts[rangeId];
    if (availableTimeout) {
      clearTimeout(availableTimeout);
      delete rangeTimeouts[rangeId];
    }

    this.injectRange(path, range);

    const lines = this.getRangeLines(path, range.startLine, range.endLine);
    if (!lines || Object.keys(lines).length === 0) {
      return;
    }

    const addInnerTextState = useInnerTextState.getState().addInnerTextState;
    for (const [lineNumberStr, line] of Object.entries(lines)) {
      const lineNumber = parseInt(lineNumberStr);

      const innerTextWrapper = this.getInnerTextWrapper(line);
      if (!innerTextWrapper) {
        continue;
      }

      let lineOffset = 0;
      for (const child of innerTextWrapper.children) {
        const innerTextId = RangeHandler.getInnerTextId(
          path,
          lineNumber,
          lineOffset,
        );

        const isInRange = this.isInRange({ lineNumber, lineOffset }, range);
        if (isInRange) {
          addInnerTextState(innerTextId, state);
          lineOffset +=
            this.injectedInnerTexts[innerTextId].element.innerText.length;
          continue;
        }

        const element = child as HTMLElement;
        lineOffset += element.innerText.length;
      }
    }
  };

  removeRangeState = (path: string, range: Range, state: InnerTextState) => {
    this.injectRange(path, range);

    const lines = this.getRangeLines(path, range.startLine, range.endLine);
    if (!lines || Object.keys(lines).length === 0) {
      return;
    }

    const removeInnerTextState =
      useInnerTextState.getState().removeInnerTextState;
    for (const [lineNumberStr, line] of Object.entries(lines)) {
      const lineNumber = parseInt(lineNumberStr);

      const innerTextWrapper = this.getInnerTextWrapper(line);
      if (!innerTextWrapper) {
        continue;
      }

      let lineOffset = 0;
      for (const child of innerTextWrapper.children) {
        const innerTextId = RangeHandler.getInnerTextId(
          path,
          lineNumber,
          lineOffset,
        );

        const isInRange = this.isInRange({ lineNumber, lineOffset }, range);
        if (isInRange) {
          removeInnerTextState(innerTextId, state);
          lineOffset +=
            this.injectedInnerTexts[innerTextId].element.innerText.length;
          continue;
        }

        const element = child as HTMLElement;
        lineOffset += element.innerText.length;
      }
    }
  };

  private standardizeRows(rows?: Element[]) {
    if (rows) {
      this.removeDefaultBackground(rows);
      this.wrapInnerText(rows);
    }

    const allRows = Object.values(this.fileDiffTable)
      .map((fileRows) => Array.from(fileRows.children))
      .flat();
    this.removeDefaultBackground(allRows);
    this.wrapInnerText(allRows);
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

  private wrapInnerText(rows: Element[]) {
    for (const row of rows) {
      const rowInfo = this.getRowInfo(row);
      const line = rowInfo?.right;
      if (!line) {
        continue;
      }

      const innerTextWrapper = this.getInnerTextWrapper(line);
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
    }
  }

  private prepareLines = async () => {
    const { firstGeneration, extendedGenerations } =
      this.nodesStore.getDescendantHunks("root");
    for (const hunk of [...firstGeneration, ...extendedGenerations]) {
      const path = hunk.node.path;
      await this.prepareRangeLines(path, hunk.node);
      if (hunk.node.srcs) {
        for (const src of hunk.node.srcs) {
          await this.prepareRangeLines(path, src);
        }
      }
    }
  };

  private prepareRangeLines = async (
    path: string,
    { startLine, endLine }: Range,
  ) => {
    const { closestRow, closenessType } = this.getClosestRow(
      path,
      startLine,
      endLine,
    );
    if (!closestRow || !closenessType) {
      return;
    }

    let linesCount = 0;
    const rangeLength = endLine - startLine + 1;
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
        this.lines[RangeHandler.getLineId(path, rowInfo.rightLineNumber)] =
          rowInfo.right;
        linesCount++;
      }

      if (linesCount === rangeLength) {
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
  };
}
