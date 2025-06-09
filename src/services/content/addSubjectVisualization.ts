import ReactDOM from "react-dom/client";
import React from "react";
import { getSubjectContainer } from "@/services/content/addSubjectVisualization/getSubjectContainer.ts";
import { SubjectNode } from "@/components/content/SubjectNode.tsx";
import { NodesStore } from "@/services/content/NodesStore.ts";

export const addSubjectVisualization = (
  url: string,
  nodesStore: NodesStore,
) => {
  const subjectContainer = getSubjectContainer(url);
  if (!subjectContainer) {
    return;
  }

  const reactContainer = document.createElement("div");
  subjectContainer.appendChild(reactContainer);
  const root = ReactDOM.createRoot(reactContainer);
  root.render(React.createElement(SubjectNode, { nodesStore }));
};
