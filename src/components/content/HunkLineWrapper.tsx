import React, { RefObject } from "react";
import { colors } from "@/public/colors.ts";
import { NodeOverlay } from "@/components/content/NodeOverlay.tsx";
import { NodesStore } from "@/services/content/NodesStore.ts";
import { Hunk } from "@/services/content/graph/Hunk.ts";

export const HunkLineWrapper: React.FC<{
  nodesStore: NodesStore;
  hunk: Hunk[];
  element: HTMLElement;
}> = ({ nodesStore, hunk, element }) => {
  if (hunk.length === 0) {
    return;
  }

  const color = colors.HUNK[hunk[0].node.nodeType];

  const ref: RefObject<HTMLDivElement | null> = useRef(null);
  useEffect(() => {
    if (ref.current && element) {
      element.style.backgroundColor = color;
      ref.current.appendChild(element);
    }
  }, [element]);

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
