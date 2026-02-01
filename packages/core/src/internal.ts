// Internal utilities for @nudge-ai/cli
// Not part of the public API

export type { BaseStep } from "./create-step.js";
export { formatStepForAI, registerPrompts } from "./nudge.js";
export type { PromptBuilderState } from "./types.js";

// Type augmentation interfaces (must be exported for module augmentation)
export type {
  GeneratedPrompt,
  PromptRegistry,
  PromptVariables,
  PromptVariants,
} from "./nudge.js";
