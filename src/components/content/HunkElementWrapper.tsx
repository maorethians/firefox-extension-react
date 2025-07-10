import React, { RefObject } from "react";
import { colors } from "@/public/colors.ts";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { Hunk } from "@/services/content/graph/Hunk.ts";
import { useColorMode } from "@/services/content/useColorMode.ts";
import { useHunkHighlight } from "@/services/content/useHunkHighlight.ts";
import { useSubjectHunkId } from "@/services/content/useSubjectHunkId.ts";

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const HunkElementWrapper: React.FC<{
  nodesStore: NodesStore;
  hunk: Hunk;
  element: HTMLElement;
  strength: number;
}> = ({ hunk, element, strength }) => {
  const { id } = hunk.node;

  const subjectHunkId = useSubjectHunkId((state) => state.hunkId);
  const setSubjectHunkId = useSubjectHunkId((state) => state.setHunkId);

  const hunkHighlight = useHunkHighlight((state) => state.hunkHighlight[id]);
  const setHunkHighlight = useHunkHighlight((state) => state.setHunkHighlight);

  const colorMode = useColorMode((state) => state.colorMode);
  const color = hexToRgba(
    hunkHighlight || id === subjectHunkId
      ? colors[colorMode].HIGHLIGHT
      : colors[colorMode].ADDITION,
    strength,
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
      onMouseEnter={() => {
        setHunkHighlight(id, true);
      }}
      onMouseLeave={() => {
        setHunkHighlight(id, false);
      }}
      onClick={() => {
        setSubjectHunkId(subjectHunkId === id ? null : id);
      }}
    ></span>
  );
};
