import React, { RefObject } from "react";
import { colors } from "@/public/colors.ts";
import { NodeOverlay } from "@/components/content/NodeOverlay.tsx";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { Hunk } from "@/services/content/graph/Hunk.ts";
import { useColorMode } from "@/services/content/useColorMode.ts";

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
}> = ({ nodesStore, hunk, element, strength }) => {
  if (hunk.length === 0) {
    return;
  }
  const colorMode = useColorMode((state) => state.colorMode);

  const color = hexToRgba(
    colors.HUNK[hunk[0].node.nodeType][colorMode],
    strength,
  );

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
    <div
      ref={ref}
      style={{ backgroundColor: color, position: "relative" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <NodeOverlay
          nodesStore={nodesStore}
          nodeIds={hunk.map(({ node }) => node.id)}
          style={{ top: 0, right: "100%" }}
        />
      )}
    </div>
  );
};
