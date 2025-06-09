import React, { useEffect } from "react";
import { Chip } from "@mui/material";
import { ContainerClient } from "@/services/ContainerClient.ts";

export const CheckContainer: React.FC = () => {
  const [serviceStatus, setServiceStatus] = React.useState<
    "up" | "down" | "unknown"
  >("unknown");

  const updateServiceStatus = async () => {
    const isServiceUp = await ContainerClient.check();
    setServiceStatus(isServiceUp ? "up" : "down");
  };

  useEffect(() => {
    updateServiceStatus();
    const interval = setInterval(updateServiceStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  let backgroundColor;
  switch (serviceStatus) {
    case "up":
      backgroundColor = "#4caf50";
      break;
    case "down":
      backgroundColor = "#f44336";
      break;
    default:
      backgroundColor = "#555";
  }

  return (
    <div>
      <Chip
        label={`Service is ${serviceStatus}`}
        style={{
          backgroundColor: backgroundColor,
          color: "#fff",
        }}
      />
    </div>
  );
};
