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
  } else if (states.includes("strongMove")) {
    return colors[colorMode].MOVED;
  } else if (states.includes("weakMove")) {
    return weakenColor(colors[colorMode].MOVED, 0.45);
  } else if (states.includes("strongAddition")) {
    return colors[colorMode].ADDITION;
  } else if (states.includes("weakAddition")) {
    return weakenColor(colors[colorMode].ADDITION, 0.45);
  }

  return;
};

export const SpanWrapper: React.FC<{
  rangeIds: string[];
  nodesStore: NodesStore;
  element: HTMLElement;
}> = ({ rangeIds, element }) => {
  const rangeHandler = useRangeHandler((state) => state.rangeHandler)!;
  const groupsRanges = uniq(
    rangeIds.map((rangeId) => rangeHandler.getRangeGroup(rangeId)).flat(),
  );
  const groupHunkId = rangeIds.map((rangeId) =>
    rangeHandler.getGroupParentSubject(rangeId),
  )[0];
  const subjectHunkId = useSubjectHunkId((state) => state.hunkId);
  const setSubjectHunkId = useSubjectHunkId((state) => state.setHunkId);

  const rangesStates = rangeIds.map((rangeId) =>
    useRangeState((state) => state.rangeStates[rangeId]),
  );
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
