import { Steps } from "@/components/popup/Steps.tsx";

// TODO: retry on service down
// TODO: inject on unified/split
// TODO: highlight srcs (src/dst scroll)
// TODO: new loading system (each loading needs to check only sub nodes)
// TODO: potential issue: default coloring may not be eliminated on expansion

function App() {
  return (
    <div>
      <Steps />
    </div>
  );
}

export default App;
