import { Commit } from "@/types";
import ReactDOM from "react-dom/client";
import React from "react";
import { SubjectNode } from "@/components/SubjectNode.tsx";
import { getSubjectContainer } from "@/services/content/addSubjectVisualization/getSubjectContainer.ts";

export const addSubjectVisualization = (commit: Commit) => {
  const subjectContainer = getSubjectContainer();
  if (!subjectContainer) {
    return;
  }

  const reactContainer = document.createElement("div");
  subjectContainer.appendChild(reactContainer);
  const root = ReactDOM.createRoot(reactContainer);
  root.render(React.createElement(SubjectNode, { commit }));
};
