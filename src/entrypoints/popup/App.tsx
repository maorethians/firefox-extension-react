import "./App.css";
import { JSONSelector } from "@/components/popup/JSONSelector.tsx";
import { APIKey } from "@/components/popup/APIKey.tsx";
import { theme } from "@/public/colors.ts";
import { ThemeProvider } from "@mui/material";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <div>
        <JSONSelector />
        <APIKey />
      </div>
    </ThemeProvider>
  );
}

export default App;
