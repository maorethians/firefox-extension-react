import ReactDOM from "react-dom/client";
import React from "react";
import { ClustersList } from "@/components/content/ClustersList.tsx";
import { StorageKey } from "@/services/StorageKey.ts";
import { Commit } from "@/types";
import { storage } from "wxt/storage";

const addClustersList = async () => {
  const url = new URL(window.location.href);
  const sha = url.searchParams.get("sha");
  if (!sha) {
    return;
  }

  const commit: Commit | null = await storage.getItem(
    StorageKey.getWithSha(sha),
  );
  if (!commit) {
    return;
  }

  const clusters = commit.clusters.map((cluster) => JSON.parse(cluster));
  const root = ReactDOM.createRoot(document.getElementById("clusterList")!);
  root.render(React.createElement(ClustersList, { clusters }));
};

addClustersList();
