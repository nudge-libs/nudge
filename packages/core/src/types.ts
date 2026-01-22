import type { Nudge, PromptStep, StepType } from "./steps.js";

export type { Nudge, PromptStep, StepType };

export type PromptBuilderState = PromptStep[];

export type PromptBuilder = {
  raw: (value: string) => PromptBuilder;
  persona: (role: string) => PromptBuilder;
  input: (description: string) => PromptBuilder;
  output: (description: string) => PromptBuilder;
  do: (instruction: string, options?: { nudge?: Nudge }) => PromptBuilder;
  dont: (instruction: string, options?: { nudge?: Nudge }) => PromptBuilder;
  constraint: (rule: string, options?: { nudge?: Nudge }) => PromptBuilder;
  example: (input: string, output: string) => PromptBuilder;
};

// Empty interface - augmented by generated file
export interface PromptRegistry {}

export type PromptId = keyof PromptRegistry;

export type Prompt<Id extends string = string> = {
  id: Id;
  _state: PromptBuilderState;
  toString: () => string;
};

export type GeneratedPrompt = { text: string; hash: string };
