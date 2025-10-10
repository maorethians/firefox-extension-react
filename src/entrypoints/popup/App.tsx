import { Steps } from "@/components/popup/Steps.tsx";

// TODO: evaluation (review time - gamification (matching))
// TODO: make it statement grained
// TODO: does not send request on first commit
// TODO: retry on service down
// TODO: inject on unified/split
// TODO: scroll in hunk mode

// TODO: not talk about "reference" in code ids
// TODO: give tooltip for most of buttons
// TODO: auto scroll on subject change
// TODO: what if we cache but a new commit comes in afterwards?
// TODO: known story granularity issue: https://github.com/spring-projects/spring-boot/commit/3e41807e1d5561256424f5f2b098f74bcc706e40

// TODO: toward code narrator (CodeGI) -> what should we do with big hunks (classes/methods)?

// https://github.com/spring-projects/spring-boot/commit/3e41807e1d5561256424f5f2b098f74bcc706e40

function App() {
  return (
    <div>
      <Steps />
    </div>
  );
}

export default App;
