import ReactDOM from "react-dom/client";
import React from "react";
import { getMainApplicationContainer } from "@/services/content/addControlPanel/getMainApplicationContainer.ts";
import { ControlPanel } from "@/components/ControlPanel.tsx";
import { Commit } from "@/types";

export const addControlPanel = (commit: Commit) => {
  const mainApplicationContainer = getMainApplicationContainer();
  if (!mainApplicationContainer) {
    return;
  }
  console.log(mainApplicationContainer);

  const reactContainer = document.createElement("div");
  reactContainer.style.position = "sticky";
  reactContainer.style.top = "0";
  reactContainer.style.zIndex = "1000";
  mainApplicationContainer.prepend(reactContainer);
  const root = ReactDOM.createRoot(reactContainer);
  root.render(React.createElement(ControlPanel, { commit }));
};
