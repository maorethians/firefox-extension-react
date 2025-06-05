import ReactDOM from "react-dom/client";
import React from "react";
import { StorageKey } from "@/services/StorageKey.ts";
import { Cluster, Hierarchy } from "@/types";
import { storage } from "wxt/storage";
import { Graph } from "@/components/content/Graph.tsx";
import { UrlHelper } from "@/services/UrlHelper.ts";
import { prepareStorage } from "@/services/prepareStorage.ts";

const render = (hierarchy: Hierarchy, clusters: Cluster[]) => {
  const root = ReactDOM.createRoot(document.getElementById("graph")!);
  root.render(React.createElement(Graph, { hierarchy, clusters }));
};

const addGraph = async () => {
  const url = new URL(window.location.href).searchParams.get("url");
  if (!url) {
    return;
  }

  const [storageHierarchy, storageClusters] = await Promise.all([
    storage.getItem(StorageKey.hierarchy(UrlHelper.getId(url))),
    storage.getItem(StorageKey.clusters(UrlHelper.getId(url))),
  ]);
  if (storageHierarchy && storageClusters) {
    render(storageHierarchy as Hierarchy, storageClusters as Cluster[]);
  } else {
    prepareStorage(url, render);
  }
};

addGraph();
