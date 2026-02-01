import type { Prompt } from "@nudge-ai/core";
import type { PromptBuilderState } from "@nudge-ai/core/internal";
import fg from "fast-glob";
import { pathToFileURL } from "url";

export type DiscoveredPrompt = {
  id: string;
  state: PromptBuilderState;
  filePath: string;
};

function isPrompt(value: unknown): value is Prompt {
  return (
    value !== null &&
    typeof value === "object" &&
    "id" in value &&
    "_state" in value
  );
}

export async function discoverPrompts(
  dir: string,
  pattern: string,
): Promise<DiscoveredPrompt[]> {
  const prompts: DiscoveredPrompt[] = [];

  const files = fg.sync(pattern, {
    cwd: dir,
    absolute: true,
    ignore: ["**/node_modules/**"],
  });

  for (const filePath of files) {
    const fileUrl = pathToFileURL(filePath).href;
    const module = await import(fileUrl);

    for (const [, value] of Object.entries(module)) {
      if (isPrompt(value)) {
        prompts.push({
          id: value.id,
          state: value._state,
          filePath,
        });
      }
    }
  }

  return prompts;
}
