import React, { RefObject } from "react";
import { colors } from "@/public/colors.ts";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { useColorMode } from "@/services/content/useColorMode.ts";
import {
  RangeState,
  rangeTimeouts,
  useRangeState,
} from "@/services/content/useRangeState.ts";
import { ColorMode } from "@/services/content/getColorMode";
import { compact, uniq } from "lodash";
import { useRangeHandler } from "@/services/content/useRangeHandler.ts";
import { useSubjectHunkId } from "@/services/content/useSubjectHunkId.ts";

const weakenColor = (color: string, alpha: number) => {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getColor = (states: RangeState[], colorMode: ColorMode) => {
  if (states.includes("highlight")) {
    return colors[colorMode].HIGHLIGHT;
  }

  for (const state of states) {
    switch (state) {
      case "strongAddition":
        return colors[colorMode].ADDITION;
      case "weakAddition":
        return weakenColor(colors[colorMode].ADDITION, 0.45);
      case "strongMove":
        return colors[colorMode].MOVED;
      case "weakMove":
        return weakenColor(colors[colorMode].MOVED, 0.45);
    }
  }
};

export const SpanWrapper: React.FC<{
  rangeIds: string[];
  nodesStore: NodesStore;
  element: HTMLElement;
}> = ({ rangeIds, element }) => {
  const subjectHunkId = useSubjectHunkId((state) => state.hunkId);
  const setSubjectHunkId = useSubjectHunkId((state) => state.setHunkId);

  const rangeHandler = useRangeHandler((state) => state.rangeHandler)!;

  const groupsRanges = uniq(
    rangeIds.map((rangeId) => rangeHandler.getRangeGroup(rangeId)).flat(),
  );
  const groupHunkId = rangeIds.map((rangeId) =>
    rangeHandler.getGroupParentSubject(rangeId),
  )[0];

  const rangesStates = rangeIds
    .map((rangeId) => ({
      id: rangeId,
      ...rangeHandler.getRangeDetail(rangeId),
    }))
    .sort((r1, r2) => r1.length - r2.length)
    .map((range) => useRangeState((state) => state.rangeStates[range.id]));
  const states = compact(rangesStates).flat();

  const colorMode = useColorMode((state) => state.colorMode);
  const color = getColor(states, colorMode);

  const addRangeState = useRangeState((state) => state.addRangeState);
  const removeRangeState = useRangeState((state) => state.removeRangeState);

  const ref: RefObject<HTMLDivElement | null> = useRef(null);
  useEffect(() => {
    if (ref.current && element) {
      ref.current.appendChild(element);
    }
  }, [element]);

  return (
    <span
      ref={ref}
      style={{
        backgroundColor:
          subjectHunkId === groupHunkId ? colors[colorMode].HIGHLIGHT : color,
        transition: "background-color 200ms ease",
        cursor: "pointer",
      }}
      onClick={() => {
        if (!groupHunkId) {
          return;
        }

        if (subjectHunkId === groupHunkId) {
          setSubjectHunkId(null);
        } else {
          setSubjectHunkId(groupHunkId);
        }
      }}
      onMouseEnter={() => {
        for (const rangeId of groupsRanges) {
          addRangeState(rangeId, "highlight");
        }
      }}
      onMouseLeave={() => {
        for (const rangeId of groupsRanges) {
          rangeTimeouts[rangeId] = setTimeout(() => {
            removeRangeState(rangeId, "highlight");
          }, 500);
        }
      }}
    ></span>
  );
};
