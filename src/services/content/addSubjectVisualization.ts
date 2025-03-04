import { Commit } from "@/types";
import ReactDOM from "react-dom/client";
import React from "react";
import { SubjectNode } from "@/components/SubjectNode.tsx";

export const addSubjectVisualization = (commit: Commit) => {
  const descriptionContainer = document
    .getElementsByClassName("full-commit")
    .item(0);
  if (!descriptionContainer) {
    return;
  }

  const reactContainer = document.createElement("div");
  descriptionContainer.appendChild(reactContainer);
  const root = ReactDOM.createRoot(reactContainer);
  root.render(React.createElement(SubjectNode, { commit }));
};
