import ReactDOM from "react-dom/client";
import React from "react";
import { StorageKey } from "@/services/StorageKey.ts";
import { Commit } from "@/types";
import { storage } from "wxt/storage";
import { Graph } from "@/components/content/Graph.tsx";

const addGraph = async () => {
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

  const root = ReactDOM.createRoot(document.getElementById("graph")!);
  root.render(React.createElement(Graph, { clusters: commit.clusters }));
};

addGraph();
