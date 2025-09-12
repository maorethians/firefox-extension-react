import { tool } from "@langchain/core/tools";
import { keyBy } from "lodash";
import { z, ZodSchema } from "zod";

enum ToolName {
  FetchCodeSurroundings = "fetchCodeSurroundings",
}

const toolNames = Object.values(ToolName) as string[];

export const isToolName = (name: string): name is ToolName =>
  toolNames.includes(name);

export const toolsContentJSONRegex: Record<ToolName, RegExp> = {
  [ToolName.FetchCodeSurroundings]:
    /\{\s*"name"\s*:\s*"fetchCodeSurroundings"\s*,\s*"arguments"\s*:\s*\{\s*"ids"\s*:\s*\[\s*"(?:[^"]*)"(?:\s*,\s*"(?:[^"]*)")*\s*\]\s*\}\s*\}/g,
};

export type ToolsArguments = {
  [ToolName.FetchCodeSurroundings]: { ids: string[] };
};

const toolArgumentsSchemas: Record<ToolName, ZodSchema> = {
  fetchCodeSurroundings: z.object({
    ids: z.array(z.string()),
  }),
};

export const toolsArgumentsVerifier: Record<ToolName, (args: any) => boolean> =
  {
    [ToolName.FetchCodeSurroundings]: (
      args,
    ): args is ToolsArguments[ToolName.FetchCodeSurroundings] => {
      try {
        toolArgumentsSchemas.fetchCodeSurroundings.parse(args);
        return true;
      } catch (e) {
        return false;
      }
    },
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
        name: "fetchCodeSurroundings",
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
};
