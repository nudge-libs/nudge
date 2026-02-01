import type {
  GeneratedPrompt,
  PromptBuilderState,
} from "@nudge-ai/core/internal";
import crypto from "crypto";
import * as fs from "fs";

export function hashState(state: PromptBuilderState): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(state))
    .digest("hex")
    .slice(0, 16);
}

export function loadExistingPrompts(
  outputPath: string,
): Record<string, GeneratedPrompt> {
  if (!fs.existsSync(outputPath)) return {};

  try {
    const content = fs.readFileSync(outputPath, "utf-8");
    const match = content.match(/const prompts = (\{[\s\S]*?\}) as const;/);
    if (!match) return {};

    const fn = new Function(`return ${match[1]}`);
    return fn() as Record<string, GeneratedPrompt>;
  } catch {
    return {};
  }
}
