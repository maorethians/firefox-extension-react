import ReactDOM from "react-dom/client";
import React from "react";
import { Cluster, StorageData } from "@/types";
import { Graph } from "@/components/content/Graph.tsx";
import { prepareStorage } from "@/services/prepareStorage.ts";

const render = async (storageData: StorageData, clusters: Cluster[]) => {
  const root = ReactDOM.createRoot(document.getElementById("graph")!);
  root.render(React.createElement(Graph, { hierarchy: storageData, clusters }));
};

const addGraph = async () => {
  const url = new URL(window.location.href).searchParams.get("url");
  if (!url) {
    return;
  }

  await prepareStorage(url, render);
};

addGraph();
