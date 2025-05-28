import React from "react";
import { colors } from "@/public/colors.ts";
import { Button } from "@mui/material";
import { Graph } from "@/types";
import { CLUSTER_MESSAGE } from "@/components/content/Graph.tsx";

export const ClustersList: React.FC<{ clusters: Graph[] }> = ({ clusters }) => {
  console.log(clusters);
  return (
    <div
      style={{
        backgroundColor: colors.PRIMARY,
      }}
    >
      <Button
        variant="contained"
        onClick={() => {
          window.postMessage({
            type: CLUSTER_MESSAGE,
            data: { commit: true },
          });
        }}
      >
        {`commit`}
      </Button>
      {clusters.map((_cluster, index) => (
        <Button
          variant="contained"
          onClick={() => {
            window.postMessage({
              type: CLUSTER_MESSAGE,
              data: { clusterIndex: index },
            });
          }}
        >
          {`cluster-${index}`}
        </Button>
      ))}
    </div>
  );
};
