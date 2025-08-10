import React, { RefObject } from "react";
import { colors } from "@/public/colors.ts";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { useColorMode } from "@/services/content/useColorMode.ts";
import {
  InnerTextState,
  useInnerTextState,
} from "@/services/content/useInnerTextState.ts";
import { ColorMode } from "@/services/content/getColorMode";

const weakenColor = (color: string, alpha: number) => {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getColor = (states: Set<InnerTextState>, colorMode: ColorMode) => {
  if (states.has("highlight")) {
    return colors[colorMode].HIGHLIGHT;
  } else if (states.has("strongMove")) {
    return colors[colorMode].MOVED;
  } else if (states.has("weakMove")) {
    return weakenColor(colors[colorMode].MOVED, 0.45);
  } else if (states.has("strongAddition")) {
    return colors[colorMode].ADDITION;
  } else if (states.has("weakAddition")) {
    return weakenColor(colors[colorMode].ADDITION, 0.45);
  }

  return;
};

export const InnerTextWrapper: React.FC<{
  innerTextId: string;
  nodesStore: NodesStore;
  element: HTMLElement;
  addRangeState: (state: InnerTextState) => void;
  removeRangeState: (state: InnerTextState) => void;
}> = ({ innerTextId, element, addRangeState, removeRangeState }) => {
  const innerTextState = useInnerTextState(
    (state) => state.innerTextStates[innerTextId],
  );
  const colorMode = useColorMode((state) => state.colorMode);
  const color = getColor(
    innerTextState ?? new Set<InnerTextState>(),
    colorMode,
  );

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
        backgroundColor: color,
        transition: "background-color 200ms ease",
        cursor: "pointer",
      }}
      onMouseEnter={() => addRangeState("highlight")}
      onMouseLeave={() => removeRangeState("highlight")}
    ></span>
  );
};
