import { Steps } from "@/components/popup/Steps.tsx";

// TODO: test it on jabref pull requests
// TODO: evaluation (review time - gamification (matching))
// TODO: make it statement grained
// TODO: does not send request on first commit
// TODO: retry on service down
// TODO: inject on unified/split
// TODO: scroll in hunk mode
// TODO: enrich some minimal hunks (simpleName, parameter declaration,...) with their type in the prompte

// TODO: not talk about "reference" in code ids
// TODO: layered navigation
// TODO: give tooltip for most of buttons
// TODO: auto scroll on subject change

function App() {
  return (
    <div>
      <Steps />
    </div>
  );
}

export default App;
