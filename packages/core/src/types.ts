import type { Nudge, PromptStep, StepType } from "./steps.js";

export type { Nudge, PromptStep, StepType };

export type PromptBuilderState = PromptStep[];

export type PromptBuilder<Optionals extends string = never> = {
  raw: (value: string) => PromptBuilder<Optionals>;
  persona: (role: string) => PromptBuilder<Optionals>;
  input: (description: string) => PromptBuilder<Optionals>;
  output: (description: string) => PromptBuilder<Optionals>;
  context: (information: string) => PromptBuilder<Optionals>;
  do: (
    instruction: string,
    options?: { nudge?: Nudge },
  ) => PromptBuilder<Optionals>;
  dont: (
    instruction: string,
    options?: { nudge?: Nudge },
  ) => PromptBuilder<Optionals>;
  constraint: (
    rule: string,
    options?: { nudge?: Nudge },
  ) => PromptBuilder<Optionals>;
  example: (input: string, output: string) => PromptBuilder<Optionals>;
  use: (source: { _state: PromptBuilderState }) => PromptBuilder<Optionals>;
  optional: <Name extends string, Inner extends string = never>(
    name: Name,
    builderFn: (p: PromptBuilder) => PromptBuilder<Inner>,
  ) => PromptBuilder<Optionals | Name | Inner>;
};

// Empty interface - augmented by generated file
export interface PromptRegistry {}

export type PromptId = keyof PromptRegistry;

export type Prompt<
  Id extends string = string,
  Optionals extends string = never,
> = {
  id: Id;
  _state: PromptBuilderState;
  toString: [Optionals] extends [never]
    ? () => string
    : (options?: Partial<Record<Optionals, boolean>>) => string;
};

export type GeneratedPrompt = { text: string; hash: string };
