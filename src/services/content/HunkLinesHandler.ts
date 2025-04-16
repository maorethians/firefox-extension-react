import { Commit, Node } from "@/types";
import { intersection, uniq } from "lodash";
import ReactDOM from "react-dom/client";
import React from "react";
import { HunkLineWrapper } from "@/components/HunkLineWrapper.tsx";
import BPromise from "bluebird";

type ClosenessType = "start" | "end";
type Direction = "up" | "down";

export class HunkLinesHandler {
  private readonly commit: Commit;
  private currentLines: {
    line: Element;
    placeholder: Element;
  }[] = [];
  private fileDiffTable: Record<string, HTMLTableSectionElement> = {};

  constructor(commit: Commit) {
    this.commit = commit;
  }

  async init() {
    const portalHook = document.getElementById("commit-details-marker-portal");
    if (!portalHook) {
      return;
    }

    const filesDiffParent = portalHook.nextElementSibling;
    if (!filesDiffParent) {
      return;
    }

    for (const fileDiff of filesDiffParent.children) {
      const filePathSection = fileDiff.children.item(0)?.firstElementChild;
      if (!filePathSection) {
        continue;
      }
      const filePathButton = filePathSection.querySelector("button");
      const filePathWrapper = filePathButton?.nextElementSibling;
      const filePathElement =
        filePathWrapper?.firstElementChild?.firstElementChild
          ?.nextElementSibling?.firstElementChild;
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
    }

    window.addEventListener("message", async ({ data }: MessageEvent) => {
      if (data.type !== SUBJECT_MESSAGE_TYPE) {
        return;
      }

      const { subjectId } = data.data;
      const requestedSubjectNode = this.commit.nodes.find(
        (node) => node.id === subjectId,
      );
      if (!requestedSubjectNode) {
        return;
      }

      this.revertCurrentLines();
      await this.injectLines(requestedSubjectNode);
    });

    const subjectNode = this.commit.nodes.find((node) => node.id === "commit");
    if (!subjectNode) {
      return;
    }
    await this.injectLines(subjectNode);
  }

  private revertCurrentLines() {
    for (const { line, placeholder } of this.currentLines) {
      placeholder.parentElement?.replaceChild(line, placeholder);
    }

    this.currentLines = [];
  }

  private async injectLines(subjectNode: Node) {
    const descendantLeaves = this.getDescendantLeaves(subjectNode);
    const hunkIds = uniq(descendantLeaves.map((leaf) => leaf.hunkId));
    const hunks = hunkIds.map((hunkId) =>
      this.commit.nodes.filter((node) => node.hunkId === hunkId),
    );

    for (const hunk of hunks) {
      const { startLine, endLine, file } = hunk[0];

      const { closestRow, closenessType } = this.getClosestRow(
        Array.from(this.fileDiffTable[file].children),
        startLine,
        endLine,
      );
      if (!closestRow || !closenessType) {
        continue;
      }

      const lines: Element[] = [];
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
          lines.push(rowInfo.right);
        }

        if (lines.length === hunkLength) {
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

      if (lines.length === 0) {
        continue;
      }

      for (const line of lines) {
        const component = React.createElement(HunkLineWrapper, {
          commit: this.commit,
          hunk,
          element: line.cloneNode(true) as HTMLElement,
        });

        const placeholder = document.createElement("div");
        line.parentElement?.replaceChild(placeholder, line);
        const root = ReactDOM.createRoot(placeholder);
        root.render(component);

        this.currentLines.push({ line, placeholder });
      }
    }
  }

  private getDescendantLeaves(subjectNode: Node): Node[] {
    const descendantNodes: Node[] = [subjectNode];

    let hopNodeIds = [subjectNode.id];
    while (true) {
      const hopChildren = this.commit.nodes.filter(
        (node) =>
          node.aggregatorIds &&
          intersection(hopNodeIds, node.aggregatorIds).length > 0,
      );

      if (hopChildren.length == 0) {
        break;
      }

      hopNodeIds = hopChildren.map((node) => node.id);
      descendantNodes.push(...hopChildren);
    }

    return descendantNodes.filter(
      (node) => node.nodeType === "BASE" || node.nodeType === "EXTENSION",
    );
  }

  private getRowInfo(row?: Element | null) {
    if (!row) {
      return;
    }

    // if (row.nodeName !== "TR") {
    //   return;
    // }

    const right = row.lastElementChild;
    if (!right) {
      return;
    }

    const rightLine =
      right.previousElementSibling?.firstElementChild?.innerHTML;
    if (!rightLine) {
      return { right };
    }

    return { right, rightLineNumber: parseInt(rightLine, 10) };
  }

  private async expandRow(row: Element, direction: Direction) {
    const nextRow = this.getNextRow(row, direction);
    if (!nextRow) {
      return;
    }

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
}
