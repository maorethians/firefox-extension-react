import React from "react";
import { Tab, Tabs } from "@mui/material";
import { LaunchService } from "@/components/popup/Steps/LaunchService.tsx";
import { LLMKey } from "@/components/popup/Steps/LLMKey.tsx";
import { Box } from "@mui/system";
// @ts-ignore
import Container from "../../public/container.svg?react";
// @ts-ignore
import AiKey from "../../public/aiKey.svg?react";

const steps = [LaunchService, LLMKey];

export const Steps: React.FC = () => {
  const [step, setStep] = React.useState(0);
  const StepComponent = steps[step];

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <Box sx={{ width: "100%" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={step}
            onChange={(_event, newStep: number) => {
              setStep(newStep);
            }}
            aria-label="basic tabs example"
          >
            <Tab
              icon={<Container style={{ height: "25px" }} />}
              style={{ flex: 1 }}
            />
            <Tab
              icon={<AiKey style={{ height: "25px" }} />}
              style={{ flex: 1 }}
            />
          </Tabs>
        </Box>
      </Box>

      <div style={{ marginTop: "15px" }}>
        <StepComponent />
      </div>
    </div>
  );
};
