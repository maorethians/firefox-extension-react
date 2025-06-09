import React from "react";
import { DockerRun } from "@/components/popup/Steps/LaunchService/DockerRun.tsx";
import { CheckContainer } from "@/components/popup/Steps/LaunchService/CheckContainer.tsx";

export const LaunchService: React.FC = () => {
  return (
    <div>
      <DockerRun />
      <CheckContainer />
    </div>
  );
};
