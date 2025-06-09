import { theme } from "@/public/colors.ts";
import { ThemeProvider } from "@mui/material";
import { Steps } from "@/components/popup/Steps.tsx";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <div>
        <Steps />
      </div>
    </ThemeProvider>
  );
}

export default App;
