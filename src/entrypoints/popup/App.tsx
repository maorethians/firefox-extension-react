import { Steps } from "@/components/popup/Steps.tsx";

// TODO: test it on jabref pull requests
// TODO: evaluation (review time - gamification (matching))
// TODO: make it statement grained
// TODO: does not send request on first commit
// TODO: retry on service down
// TODO: inject on unified/split
// TODO: scroll in hunk mode

// TODO: not talk about "reference" in code ids
// TODO: change "Change" heading when it is only addition
// TODO: can we find sub clusters within cluster which are the most important ones?
// TODO: layered navigation
// TODO: give tooltip for most of buttons
// TODO: auto scroll on subject change

// TODO: doesn't call tool that much

function App() {
  return (
    <div>
      <Steps />
    </div>
  );
}

export default App;
