import { theme } from "@/public/colors.ts";
import { ThemeProvider } from "@mui/material";
import { Steps } from "@/components/popup/Steps.tsx";

// TODO: colors for light mode
// TODO: next and previous disable
// TODO: tooltip hunk description generation
// TODO: scroll to lead (next/previous on hunks)
// TODO: prioritized post process
// TODO: find frameworks for visualize the navigation
// TODO: add github action to build the extension and make it accessible
// TODO: dont refresh on change unified/split
// TODO: make generation less manual
// TODO: highlight the whole hunk on hover

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
