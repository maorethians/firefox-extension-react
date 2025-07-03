import React, { RefObject } from "react";
import { colors } from "@/public/colors.ts";
import { NodeOverlay } from "@/components/content/NodeOverlay.tsx";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { Hunk } from "@/services/content/graph/Hunk.ts";
import { useColorMode } from "@/services/content/useColorMode.ts";
import { HunkLinesHandler } from "@/services/content/HunkLinesHandler.ts";

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const HunkLineWrapper: React.FC<{
  nodesStore: NodesStore;
  hunk: Hunk[];
  element: HTMLElement;
  strength: number;
  hunkLinesHandler: HunkLinesHandler;
}> = ({ nodesStore, hunk, element, strength, hunkLinesHandler }) => {
  if (hunk.length === 0) {
    return;
  }
  const { nodeType, hunkId } = hunk[0].node;

  const colorMode = useColorMode((state) => state.colorMode);
  const color = hexToRgba(colors.HUNK[nodeType][colorMode], strength);

  const ref: RefObject<HTMLDivElement | null> = useRef(null);
  useEffect(() => {
    if (ref.current && element) {
      element.style.backgroundColor = color;
      ref.current.appendChild(element);
    }
  }, [element]);

  useEffect(() => {
    element.style.background = color;
  }, [colorMode]);

  const [isHovered, setIsHovered] = useState(false);
  return (
    <span
      ref={ref}
      style={{
        backgroundColor: color,
        position: "relative",
        transition: "background-color 200ms ease",
      }}
      onMouseEnter={() => {
        setIsHovered(true);
        hunkLinesHandler.highlightHunk(hunkId);
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <NodeOverlay
          nodesStore={nodesStore}
          nodeIds={hunk.map(({ node }) => node.id)}
          style={{ top: 0, right: "100%" }}
        />
      )}
    </span>
  );
};
