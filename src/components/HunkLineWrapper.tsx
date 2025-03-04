import React, { RefObject } from "react";
import { Commit, Node } from "@/types";
import { isHunkValid } from "@/services/content/isHunkValid.ts";
import { NodeOverlay } from "@/components/NodeOverlay.tsx";
import { colors } from "@/public/colors.ts";

export const HunkLineWrapper: React.FC<{
  commit: Commit;
  hunk: Node[];
  element: HTMLElement;
}> = ({ commit, hunk, element }) => {
  if (hunk.length === 0) {
    return;
  }

  if (!isHunkValid(hunk)) {
    return;
  }

  const color = colors.HUNK[hunk[0].nodeType];

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
          commit={commit}
          nodes={hunk}
          excludeSubject={true}
          style={{ top: 0, right: "100%" }}
        />
      )}
    </div>
  );
};
