import React from "react";
import { Button } from "@mui/material";
import { LaunchService } from "@/components/popup/Steps/LaunchService.tsx";
import { LLMKey } from "@/components/popup/Steps/LLMKey.tsx";

const steps = [LaunchService, LLMKey];

export const Steps: React.FC = () => {
  const [step, setStep] = React.useState(0);

  const StepComponent = steps[step];

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <Button onClick={() => setStep(Math.max(step - 1, 0))}>Previous</Button>
        <Button onClick={() => setStep(Math.min(step + 1, steps.length - 1))}>
          Next
        </Button>
      </div>

      <StepComponent />
    </div>
  );
};
