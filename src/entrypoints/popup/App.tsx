import { Steps } from "@/components/popup/Steps.tsx";

// TODO: retry on service down
// TODO: inject on unified/split
// TODO: highlight srcs (src/dst scroll)
// TODO: new loading system (each loading needs to check only sub nodes)
// TODO: potential issue: default coloring may not be eliminated on expansion
// TODO: evaluation (export - review time - gamification (matching))
// TODO: make it statement grained
// TODO: make a separation for moved code and additions
// TODO: show a more intuitive to user than id of nodes
// TODO: test it on jabref pull requests
// TODO: for any use of hunks, llm must first decide to get surrounding
// TODO: does not send request on first commit

function App() {
  return (
    <div>
      <Steps />
    </div>
  );
}

export default App;
