import { tool } from "@langchain/core/tools";
import { keyBy } from "lodash";
import { z, ZodSchema } from "zod";

export enum ToolName {
  FetchCodeSurroundings = "fetchCodeSurroundings",
  SubmitStatements = "submitStatements",
  SubmitBooleanResult = "submitBooleanResult",
  SubmitSelectionResult = "submitSelectionResult",
}

const toolNames = Object.values(ToolName) as string[];

export const isToolName = (name: string): name is ToolName =>
  toolNames.includes(name);

export const toolsContentJSONRegex: Record<ToolName, RegExp> = {
  [ToolName.FetchCodeSurroundings]:
    /\{\s*"name"\s*:\s*"fetchCodeSurroundings"\s*,\s*"arguments"\s*:\s*\{\s*"ids"\s*:\s*\[\s*"(?:[^"]*)"(?:\s*,\s*"(?:[^"]*)")*\s*\]\s*\}\s*\}/g,
  [ToolName.SubmitStatements]:
    /^\s*\{\s*"name"\s*:\s*"submitStatements"\s*,\s*"arguments"\s*:\s*\{\s*"statements"\s*:\s*\[\s*(?:"[^"]*"(?:\s*,\s*"[^"]*")*)?\s*\]\s*\}\s*\}\s*$/g,
  [ToolName.SubmitBooleanResult]:
    /^\{\s*"name"\s*:\s*"submitBooleanResult"\s*,\s*"arguments"\s*:\s*\{\s*"result"\s*:\s*(true|false)\s*\}\s*\}$/g,
  [ToolName.SubmitSelectionResult]:
    /^\s*\{\s*"name"\s*:\s*"submitSelectionResult"\s*,\s*"arguments"\s*:\s*\{\s*"selection"\s*:\s*\[\s*(?:"[^"]*"(?:\s*,\s*"[^"]*")*)?\s*\]\s*\}\s*\}\s*$/g,
};

export type ToolsArguments = {
  [ToolName.FetchCodeSurroundings]: { ids: string[] };
  [ToolName.SubmitStatements]: { statements: string[] };
  [ToolName.SubmitBooleanResult]: { result: boolean };
  [ToolName.SubmitSelectionResult]: { selection: string[] };
};

const toolArgumentsSchemas: Record<ToolName, ZodSchema> = {
  [ToolName.FetchCodeSurroundings]: z.object({
    ids: z.array(z.string()),
  }),
  [ToolName.SubmitStatements]: z.object({
    statements: z.array(z.string()),
  }),
  [ToolName.SubmitBooleanResult]: z.object({
    result: z.boolean(),
  }),
  [ToolName.SubmitSelectionResult]: z.object({
    selection: z.array(z.string()),
  }),
};

export const verifyToolsArguments = <T extends ToolName>(tool: T) => {
  return (args: any): args is ToolsArguments[T] => {
    try {
      toolArgumentsSchemas[tool].parse(args);
      return true;
    } catch {
      return false;
    }
  };
};

export const tools = {
  [ToolName.FetchCodeSurroundings]: (
    idSurroundings: { promptId: string; surroundings: string[] }[],
  ) => {
    const validIdSurroundings = idSurroundings.filter(
      ({ surroundings }) => surroundings.length > 0,
    );
    if (validIdSurroundings.length === 0) {
      return;
    }

    const promptIdSurroundingsIndex = keyBy(
      validIdSurroundings.map(({ promptId, surroundings }) => ({
        promptId,
        surroundings,
        index: 0,
      })),
      "promptId",
    );

    return tool(
      ({ ids }) => {
        const result = ids.map((id) => {
          let prompt = "{ id: " + id + " }\n";

          if (!promptIdSurroundingsIndex[id]) {
            prompt +=
              "The surrounding of this code cannot be expanded further.";
            return prompt;
          }

          const { surroundings, index } = promptIdSurroundingsIndex[id];
          if (index === surroundings.length) {
            prompt +=
              "The surrounding of this code cannot be expanded further.";
            return prompt;
          }

          promptIdSurroundingsIndex[id].index = index + 1;

          prompt += surroundings[index];
          return prompt;
        });

        console.log(result);

        return result.join("\n---\n");
      },
      {
        name: ToolName.FetchCodeSurroundings,
        description:
          "Returns code snippets together with their surroundings. Each time this tool is called with the same code" +
          " id, the surrounding boundaries expand further.\n\n# Guidelines:\n\`\`\`\n- You MUST call this tool" +
          " whenever the provided code snippet is not self-contained, and its purpose can only be determined from" +
          " its surroundings.\n- You MUST continue calling this tool to expand the surrounding boundaries until" +
          " the role of the code snippet can be clearly explained.\n- You are allowed to begin providing an" +
          " explanation only after the surrounding boundaries have been expanded enough to make the role of the" +
          " code snippet clear.\n\`\`\`",
        schema: z.object({
          ids: z.array(z.string()),
        }),
      },
    );
  },
  [ToolName.SubmitStatements]: tool(() => {}, {
    name: ToolName.SubmitStatements,
    description:
      "Submits the provided statements for further processing. For the set of statements you have extracted through" +
      " the task you have been asked, submit the extracted statements by calling this tool with those extracted" +
      " statements",
    schema: z.object({
      statements: z.array(z.string()),
    }),
  }),
  [ToolName.SubmitBooleanResult]: tool(() => {}, {
    name: ToolName.SubmitBooleanResult,
    description:
      "Submits the boolean result (true or false) for the provided task. For any task that produces a boolean outcome," +
      "call this tool with the result.",
    schema: z.object({
      result: z.boolean(),
    }),
  }),
  [ToolName.SubmitSelectionResult]: tool(() => {}, {
    name: ToolName.SubmitSelectionResult,
    description:
      "Submits the selected options from the provided task. For any task that requires selecting one or more options from" +
      " a given set, call this tool with the selected options.",
    schema: z.object({
      selection: z.array(z.string()),
    }),
  }),
} satisfies Record<ToolName, any>;
