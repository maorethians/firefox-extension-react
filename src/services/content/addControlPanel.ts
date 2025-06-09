import ReactDOM from "react-dom/client";
import React from "react";
import { getMainApplicationContainer } from "@/services/content/addControlPanel/getMainApplicationContainer.ts";
import { ControlPanel } from "@/components/content/ControlPanel.tsx";

export const addControlPanel = (url: string) => {
  const mainApplicationContainer = getMainApplicationContainer();
  if (!mainApplicationContainer) {
    return;
  }

  const reactContainer = document.createElement("div");
  reactContainer.style.position = "sticky";
  reactContainer.style.top = "0";
  reactContainer.style.zIndex = "1000";
  mainApplicationContainer.prepend(reactContainer);
  const root = ReactDOM.createRoot(reactContainer);
  root.render(React.createElement(ControlPanel, { url }));
};
