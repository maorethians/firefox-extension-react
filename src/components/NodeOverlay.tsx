import React from "react";
import { Commit, Node } from "@/types";
import { isHunkValid } from "@/services/content/isHunkValid.ts";
import { colors } from "@/public/colors.ts";
import { Navigator } from "@/components/Navigator.tsx";

export const NodeOverlay: React.FC<{
  commit: Commit;
  hunk: Node[];
  style?: React.CSSProperties;
}> = ({ commit, hunk, style }) => {
  if (hunk.length === 0) {
    return;
  }

  if (!isHunkValid(hunk)) {
    return;
  }

  return (
    <div
      style={{
        position: "absolute",
        backgroundColor: colors.APP,
        zIndex: 9999,
        whiteSpace: "nowrap",
        ...(style ?? {}),
      }}
    >
      <Navigator hunk={hunk} commit={commit} />
    </div>
  );
};
