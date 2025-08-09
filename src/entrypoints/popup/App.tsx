import { Steps } from "@/components/popup/Steps.tsx";

// TODO: test it on jabref pull requests
// TODO: evaluation (review time - gamification (matching))
// TODO: make it statement grained
// TODO: make a separation for moved code and additions
// TODO: does not send request on first commit
// TODO: retry on service down
// TODO: inject on unified/split
// TODO: highlight srcs (src/dst scroll)
// TODO: subject stream is not working properly

function App() {
  return (
    <div>
      <Steps />
    </div>
  );
}

export default App;
