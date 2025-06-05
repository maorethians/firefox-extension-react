import ReactDOM from "react-dom/client";
import React from "react";
import { ClustersList } from "@/components/content/ClustersList.tsx";
import { StorageKey } from "@/services/StorageKey.ts";
import { Cluster, Hierarchy } from "@/types";
import { UrlHelper } from "@/services/UrlHelper.ts";
import { prepareStorage } from "@/services/prepareStorage.ts";
import { storage } from "wxt/storage";

const render = (_hierarchy: Hierarchy, clusters: Cluster[]) => {
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

addClustersList();
