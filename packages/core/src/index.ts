import { createBuilder } from "./builder.js";
import { formatStepForAI } from "./steps.js";
import type {
  GeneratedPrompt,
  Nudge,
  Prompt,
  PromptBuilder,
  PromptBuilderState,
  PromptId,
  PromptRegistry,
  PromptStep,
  StepType,
} from "./types.js";

// Cache for generated prompts, populated by registerPrompts()
let promptCache: Record<string, GeneratedPrompt> = {};

function registerPrompts(prompts: Record<string, GeneratedPrompt>): void {
  promptCache = { ...promptCache, ...prompts };
}

function prompt<Id extends string>(
  id: Id,
  promptFunc: (p: PromptBuilder) => PromptBuilder,
): Prompt<Id> {
  const { builder, state } = createBuilder();
  promptFunc(builder);

  return {
    id,
    _state: state,
    toString: (): string => {
      return promptCache[id]?.text ?? "";
    },
  };
}

export {
  formatStepForAI,
  prompt,
  registerPrompts,
  type GeneratedPrompt,
  type Nudge,
  type Prompt,
  type PromptBuilder,
  type PromptBuilderState,
  type PromptId,
  type PromptRegistry,
  type PromptStep,
  type StepType,
};
