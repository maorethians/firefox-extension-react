import { groupBy } from "lodash";
import ReactDOM from "react-dom/client";
import React from "react";
import BPromise from "bluebird";
import { SpanWrapper } from "@/components/content/SpanWrapper.tsx";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { Hunk, SrcDst } from "@/services/content/graph/Hunk.ts";
import { UrlHelper } from "@/services/UrlHelper.ts";
import {
  SUBJECT_ID_MESSAGE,
  useSubjectId,
} from "@/services/content/useSubjectId.ts";
import { Range } from "@/types";
import {
  rangeTimeouts,
  useRangeState,
} from "@/services/content/useRangeState.ts";

type ClosenessType = "start" | "end";
type Direction = "up" | "down";

export class RangeHandler {
  private readonly type: "Commit" | "PullRequest" | "PRCommit" | null = null;
  private readonly nodesStore: NodesStore;

  private fileDiffTable: Record<string, HTMLTableSectionElement> = {};
  private fileOrder: Record<string, number> = {};
  private lines: Record<string, Element> = {};

  private rangeParent: Record<string, string> = {};
  private rangeSubject: Record<string, string> = {};
  private rangeGroup: Record<string, string[]> = {};

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
    await this.prepare();
    this.wrapInRangesSpans();

    this.addSubjectState();

    window.addEventListener("message", ({ data }: MessageEvent) => {
      if (data.type !== SUBJECT_ID_MESSAGE) {
        return;
      }

      useRangeState.getState().flushRangeState();
      this.addSubjectState();

      this.scrollIndex = 0;
    });
  }

  private addSubjectState() {
    const { firstGeneration, extendedGenerations } =
      this.nodesStore.getDescendantHunks(useSubjectId.getState().subjectId);

    this.addGenerationState(firstGeneration, "strong");
    this.addGenerationState(extendedGenerations, "weak");
  }

  addGenerationState(generation: Hunk[], strength: "strong" | "weak") {
    const addRangeState = useRangeState.getState().addRangeState;

    for (const hunk of generation) {
      addRangeState(
        RangeHandler.getRangeId(hunk.node.path, "dst", hunk.node),
        `${strength}Addition`,
      );
      if (hunk.node.srcs) {
        for (const src of hunk.node.srcs) {
          addRangeState(
            RangeHandler.getRangeId(src.path, "src", src),
            `${strength}Move`,
          );
        }
      }
      if (hunk.node.dsts) {
        for (const dst of hunk.node.dsts) {
          addRangeState(
            RangeHandler.getRangeId(hunk.node.path, "dst", dst),
            `${strength}Move`,
          );
        }
      }
    }
  }

  static getSpanId = (
    path: string,
    srcDst: SrcDst,
    lineNumber: number,
    lineOffset: number,
  ) => this.getLineId(path, srcDst, lineNumber) + "-" + lineOffset;

  static getLineId = (path: string, srcDst: SrcDst, lineNumber: number) =>
    `${path}-${srcDst}-${lineNumber}`;

  static getRangeId = (path: string, srcDst: SrcDst, range: Range) =>
    `${path}-${srcDst}-${range.startLine}-${range.startLineOffset}-${range.endLine}-${range.endLineOffset}`;

  private getSpansWrapper = (line: Element): Element | null | undefined => {
    switch (this.type) {
      case "Commit":
        return this.innerTextWrapper.commit(line);
      case "PRCommit":
      case "PullRequest":
        return this.innerTextWrapper.pullRequest(line);
    }
  };

  private getRangeLines(
    path: string,
    srcDst: SrcDst,
    startLine: number,
    endLine: number,
  ) {
    const lines: Record<number, Element> = {};
    for (let lineNumber = startLine; lineNumber <= endLine; lineNumber++) {
      lines[lineNumber] =
        this.lines[RangeHandler.getLineId(path, srcDst, lineNumber)];
    }
    return lines;
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

  private getRowInfo(row?: Element | null) {
    if (!row) {
      return;
    }

    const columns = row.querySelectorAll("td");
    switch (columns.length) {
      case 1:
      case 2:
        return {
          extend: columns.item(0).firstElementChild?.firstElementChild,
        };
      case 3:
        // unified
        return {
          srcLineNumber: this.getLineNumber(columns.item(0)),
          dstLineNumber: this.getLineNumber(columns.item(1)),
          srcTd: columns.item(2),
          dstTd: columns.item(2),
        };
      case 4:
        // split
        return {
          srcLineNumber: this.getLineNumber(columns.item(0)),
          dstLineNumber: this.getLineNumber(columns.item(2)),
          srcTd: columns.item(1),
          dstTd: columns.item(3),
        };
      default:
        return;
    }
  }

  private getLineNumber = (td: Element) =>
    td.getAttribute("data-line-number") ?? td.firstElementChild?.innerHTML;

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

  private getClosestRow(
    path: string,
    srcDst: SrcDst,
    startLine: number,
    endLine: number,
  ) {
    const rows = Array.from(this.fileDiffTable[path].children);

    let closestRow: Element | null = null;
    let closenessType: ClosenessType | null = null;
    let closestDistance = rows.length;
    for (const row of rows) {
      const rowInfo = this.getRowInfo(row);
      if (!rowInfo) {
        continue;
      }

      const td = srcDst === "src" ? rowInfo.srcTd : rowInfo.dstTd;
      const lineNumberStr =
        srcDst === "src" ? rowInfo.srcLineNumber : rowInfo.dstLineNumber;
      if (!td || !lineNumberStr) {
        continue;
      }
      const lineNumber = parseInt(lineNumberStr);

      const startDistance = Math.abs(lineNumber - startLine);
      const endDistance = Math.abs(lineNumber - endLine);
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

  // TODO: cache mid line for each range
  scrollRange = (path: string, srcDst: SrcDst, range: Range) => {
    const lines = this.getRangeLines(
      path,
      srcDst,
      range.startLine,
      range.endLine,
    );
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

    const rangeId = RangeHandler.getRangeId(path, srcDst, range);
    useRangeState.getState().addRangeState(rangeId, "highlight");
    rangeTimeouts[rangeId] = setTimeout(() => {
      useRangeState.getState().removeRangeState(rangeId, "highlight");
    }, 1000);
  };

  scrollSubject = () => {
    const orderedHunks = this.getSubjectOrderedHunks();

    const scrollHunk = orderedHunks[this.scrollIndex].node;
    this.scrollRange(scrollHunk.path, "dst", scrollHunk);

    this.scrollIndex =
      this.scrollIndex === orderedHunks.length - 1 ? 0 : this.scrollIndex + 1;
  };

  private standardizeRows(rows?: Element[]) {
    if (rows) {
      this.removeDefaultBackground(rows);
      this.wrapRowsTexts(rows);
    }

    const allRows = Object.values(this.fileDiffTable)
      .map((fileRows) => Array.from(fileRows.children))
      .flat();
    this.removeDefaultBackground(allRows);
    this.wrapRowsTexts(allRows);
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

  private wrapRowsTexts(rows: Element[]) {
    for (const row of rows) {
      const rowInfo = this.getRowInfo(row);
      if (!rowInfo) {
        continue;
      }

      const { srcTd, dstTd } = rowInfo;
      if (srcTd) {
        this.wrapTdTexts(srcTd);
      }
      if (dstTd) {
        this.wrapTdTexts(dstTd);
      }
    }
  }

  private wrapTdTexts(td: Element) {
    const innerTextWrapper = this.getSpansWrapper(td);
    if (!innerTextWrapper) {
      return;
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

  private prepare = async () => {
    const { firstGeneration, extendedGenerations } =
      this.nodesStore.getDescendantHunks("root");
    for (const hunk of [...firstGeneration, ...extendedGenerations]) {
      await this.prepareRangeLines(hunk.node.path, "dst", hunk.node);

      const rangeId = RangeHandler.getRangeId(hunk.node.path, "dst", hunk.node);
      this.rangeParent[rangeId] = rangeId;
      this.rangeSubject[rangeId] = hunk.node.id;
      if (hunk.node.srcs) {
        for (const src of hunk.node.srcs) {
          await this.prepareRangeLines(src.path, "src", src);
          this.rangeParent[RangeHandler.getRangeId(src.path, "src", src)] =
            rangeId;
        }
      }
      if (hunk.node.dsts) {
        for (const dst of hunk.node.dsts) {
          await this.prepareRangeLines(hunk.node.path, "dst", dst);
          this.rangeParent[
            RangeHandler.getRangeId(hunk.node.path, "dst", dst)
          ] = rangeId;
        }
      }
    }
  };

  private prepareRangeLines = async (
    path: string,
    srcDst: SrcDst,
    { startLine, endLine }: Range,
  ) => {
    const { closestRow, closenessType } = this.getClosestRow(
      path,
      srcDst,
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

      const td = srcDst === "src" ? rowInfo.srcTd : rowInfo.dstTd;
      const lineNumberStr =
        srcDst === "src" ? rowInfo.srcLineNumber : rowInfo.dstLineNumber;
      if (td && lineNumberStr) {
        const lineNumber = parseInt(lineNumberStr);
        if (startLine <= lineNumber && lineNumber <= endLine) {
          this.lines[RangeHandler.getLineId(path, srcDst, lineNumber)] = td;
          linesCount++;
        }
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

  private wrapInRangesSpans = () => {
    const spans: Record<string, { element: Element; rangeIds: Set<string> }> =
      {};

    const { firstGeneration, extendedGenerations } =
      this.nodesStore.getDescendantHunks("root");
    for (const hunk of [...firstGeneration, ...extendedGenerations]) {
      this.populateRangeSpans(spans, hunk.node.path, "dst", hunk.node);
      if (hunk.node.srcs) {
        for (const src of hunk.node.srcs) {
          this.populateRangeSpans(spans, src.path, "src", src);
        }
      }
      if (hunk.node.dsts) {
        for (const dst of hunk.node.dsts) {
          this.populateRangeSpans(spans, hunk.node.path, "dst", dst);
        }
      }
    }

    for (const { element, rangeIds } of Object.values(spans)) {
      const component = React.createElement(SpanWrapper, {
        rangeIds: Array.from(rangeIds),
        nodesStore: this.nodesStore,
        element: element.cloneNode(true) as HTMLElement,
      });
      const placeholder = document.createElement("span");
      element.parentElement?.replaceChild(placeholder, element);
      const root = ReactDOM.createRoot(placeholder);
      root.render(component);
    }
  };

  private populateRangeSpans = (
    spans: Record<
      string,
      {
        element: Element;
        rangeIds: Set<string>;
      }
    >,
    path: string,
    srcDst: SrcDst,
    range: Range,
  ) => {
    const rangeId = RangeHandler.getRangeId(path, srcDst, range);

    const lines = this.getRangeLines(
      path,
      srcDst,
      range.startLine,
      range.endLine,
    );
    if (!lines || Object.keys(lines).length === 0) {
      return;
    }

    for (const [lineNumberStr, line] of Object.entries(lines)) {
      const lineNumber = parseInt(lineNumberStr);

      const spansWrapper = this.getSpansWrapper(line);
      if (!spansWrapper) {
        continue;
      }

      let lineOffset = 0;
      for (const child of spansWrapper.children) {
        const spanId = RangeHandler.getSpanId(
          path,
          srcDst,
          lineNumber,
          lineOffset,
        );

        const element = child as HTMLElement;

        // TODO: an element can be partially in a range: https://github.com/JabRef/jabref/pull/13605/commits/df72a175287c7f3d719854809734c1531eb97df3
        const isInRange = this.isInRange({ lineNumber, lineOffset }, range);
        if (isInRange) {
          if (!spans[spanId]) {
            spans[spanId] = { element, rangeIds: new Set<string>() };
          }
          spans[spanId].rangeIds.add(rangeId);
        }

        lineOffset += element.innerText.length;
      }
    }
  };

  getRangeGroup = (rangeId: string) => {
    if (this.rangeGroup[rangeId]) {
      return this.rangeGroup[rangeId];
    }

    const groupParent = this.rangeParent[rangeId];
    this.rangeGroup[rangeId] = Object.entries(this.rangeParent)
      .filter(([_rangeId, parentId]) => parentId === groupParent)
      .map(([rangeId]) => rangeId);

    return this.rangeGroup[rangeId];
  };

  getGroupParentSubject = (rangeId: string) => {
    const groupParent = this.rangeParent[rangeId];
    return this.rangeSubject[groupParent];
  };
}
