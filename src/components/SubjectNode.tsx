import React, { RefObject } from "react";
import { Commit } from "@/types";
import { NodeOverlay } from "@/components/NodeOverlay.tsx";
import { colors } from "@/public/colors.ts";
import { keyBy } from "lodash";
import { Button } from "@mui/material";

export const SUBJECT_MESSAGE_TYPE = "SetSubjectNode";

export const SubjectNode: React.FC<{
  commit: Commit;
}> = ({ commit }) => {
  const nodesDictionary = keyBy(commit.nodes, "id");

  const commitNode = nodesDictionary["commit"];
  if (!commitNode) {
    return;
  }

  const [subjectNode, setSubjectNode] = useState(commitNode);

  window.addEventListener("message", ({ data }: MessageEvent) => {
    if (data.type !== SUBJECT_MESSAGE_TYPE) {
      return;
    }

    const { subjectId } = data.data;
    const requestedSubjectNode = nodesDictionary[subjectId];
    if (!requestedSubjectNode) {
      return;
    }

    setSubjectNode(requestedSubjectNode);
    // ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  const [isHovered, setIsHovered] = useState(false);
  const [isTextualRepresentationExpanded, setTextualRepresentationExpanded] =
    useState(false);
  const [isDescriptionExpanded, setDescriptionExpanded] = useState(false);

  const ref: RefObject<HTMLDivElement | null> = useRef(null);
  return (
    <div
      ref={ref}
      style={{
        backgroundColor: colors.PRIMARY,
        position: "relative",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <NodeOverlay
          commit={commit}
          hunk={[subjectNode]}
          style={{ left: 0, top: "100%" }}
        />
      )}
      <h3>{subjectNode.title ?? subjectNode.id}</h3>
      {subjectNode.textualRepresentation && (
        <div>
          <h4>Textual Representation:</h4>
          <Button
            variant="contained"
            onClick={() =>
              setTextualRepresentationExpanded(!isTextualRepresentationExpanded)
            }
          >
            Expand
          </Button>
          {isTextualRepresentationExpanded && (
            <pre>{subjectNode.textualRepresentation}</pre>
          )}
        </div>
      )}

      <h4>Description:</h4>
      {subjectNode.description ? (
        <div>
          <Button
            variant="contained"
            onClick={() => setDescriptionExpanded(!isDescriptionExpanded)}
          >
            Expand
          </Button>
          {isDescriptionExpanded && (
            <pre style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
              {subjectNode.description}
            </pre>
          )}
        </div>
      ) : (
        <Button variant="contained">Generate</Button>
      )}
    </div>
  );
};
