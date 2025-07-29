import { create } from "zustand";
import { NodesStore } from "@/services/content/NodesStore.ts";

export type ProcessState = "waiting" | "result";

type GenerationProcess = {
  remainingDependencies: string[];
  state: ProcessState;
};

type GenerationProcessState = {
  generationProcess: Record<string, GenerationProcess>;
  setGenerationProcess: (
    id: string,
    processState: ProcessState,
    nodesStore: NodesStore,
  ) => void;
};

export const useGenerationProcess = create<GenerationProcessState>((set) => ({
  generationProcess: {},
  setGenerationProcess: (id, processState, nodesStore) => {
    set((state) => {
      const generationProcess = state.generationProcess;
      const subjectGenerationProcess = generationProcess[id];

      switch (processState) {
        case "waiting":
          const allDependencies = nodesStore
            .getNodeById(id)
            .getDependencyGraphNodesId(nodesStore);
          generationProcess[id] = {
            remainingDependencies: allDependencies,
            state: processState,
          };
          break;
        case "result":
          if (!subjectGenerationProcess) {
            throw new Error("Cannot set result");
          }

          const generationProcessIds = Object.keys(generationProcess);
          for (const generationProcessId of generationProcessIds) {
            generationProcess[generationProcessId] = {
              ...generationProcess[generationProcessId],
              remainingDependencies: generationProcess[
                generationProcessId
              ].remainingDependencies.filter((dependency) => dependency !== id),
            };
          }

          generationProcess[id] = {
            ...generationProcess[id],
            state: processState,
          };
          break;
      }

      return {
        generationProcess,
      };
    });
  },
}));
