import { theme } from "@/public/colors.ts";
import { ThemeProvider } from "@mui/material";
import { LLMKey } from "@/components/popup/LLMKey.tsx";
import { DockerRun } from "@/components/popup/DockerRun.tsx";
import { CheckContainer } from "@/components/popup/CheckContainer.tsx";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <div>
        <LLMKey />
        <DockerRun />
        <CheckContainer />
      </div>
    </ThemeProvider>
  );
}

export default App;
