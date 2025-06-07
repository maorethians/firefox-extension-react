import ReactDOM from "react-dom/client";
import React from "react";
import { ClustersList } from "@/components/content/ClustersList.tsx";
import { Cluster, Hierarchy } from "@/types";
import { prepareStorage } from "@/services/prepareStorage.ts";

const render = async (_hierarchy: Hierarchy, clusters: Cluster[]) => {
  const root = ReactDOM.createRoot(document.getElementById("clusterList")!);
  root.render(
    React.createElement(ClustersList, {
      clusters,
    }),
  );
};

const addClustersList = async () => {
  const url = new URL(window.location.href).searchParams.get("url");
  if (!url) {
    return;
  }

  await prepareStorage(url, render);
};

addClustersList();
