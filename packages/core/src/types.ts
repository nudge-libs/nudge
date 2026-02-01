import type { Nudge, PromptStep, StepType } from "./steps.js";

export type { Nudge, PromptStep, StepType };

export type PromptVariant = {
  name: string;
  steps: PromptStep[];
};

export type PromptBuilderState = {
  steps: PromptStep[];
  variants?: PromptVariant[];
};

export type PromptBuilder<
  Optionals extends string = never,
  Variants extends string = never,
> = {
  raw: (value: string) => PromptBuilder<Optionals, Variants>;
  persona: (role: string) => PromptBuilder<Optionals, Variants>;
  input: (description: string) => PromptBuilder<Optionals, Variants>;
  output: (description: string) => PromptBuilder<Optionals, Variants>;
  context: (information: string) => PromptBuilder<Optionals, Variants>;
  do: (
    instruction: string,
    options?: { nudge?: Nudge },
  ) => PromptBuilder<Optionals, Variants>;
  dont: (
    instruction: string,
    options?: { nudge?: Nudge },
  ) => PromptBuilder<Optionals, Variants>;
  constraint: (
    rule: string,
    options?: { nudge?: Nudge },
  ) => PromptBuilder<Optionals, Variants>;
  example: (input: string, output: string) => PromptBuilder<Optionals, Variants>;
  use: (source: { _state: PromptBuilderState }) => PromptBuilder<Optionals, Variants>;
  optional: <Name extends string, Inner extends string = never>(
    name: Name,
    builderFn: (p: PromptBuilder) => PromptBuilder<Inner>,
  ) => PromptBuilder<Optionals | Name | Inner, Variants>;
  variant: <Name extends string>(
    name: Name,
    builderFn: (p: PromptBuilder) => PromptBuilder,
  ) => PromptBuilder<Optionals, Variants | Name>;
};

// Empty interfaces - augmented by generated file
export interface PromptRegistry { }
export interface PromptVariables { }
export interface PromptVariants { }

export type PromptId = keyof PromptRegistry;

type VariantsFor<Id extends string> = Id extends keyof PromptVariants
  ? PromptVariants[Id]
  : never;

type VariantOption<Variants extends string> = [Variants] extends [never]
  ? { variant?: never }
  : { variant?: Variants };

// Helper to build toString signature based on optionals, variables, and variants
type ToStringOptions<
  Optionals extends string,
  Variables extends string,
  Variants extends string,
> = [Variables] extends [never]
  ? [Optionals] extends [never]
  ? (options?: VariantOption<Variants>) => string
  : (options?: Partial<Record<Optionals, boolean>> & VariantOption<Variants>) => string
  : [Optionals] extends [never]
  ? (options: Record<Variables, string> & VariantOption<Variants>) => string
  : (
    options: Record<Variables, string> &
      Partial<Record<Optionals, boolean>> &
      VariantOption<Variants>,
  ) => string;

export type Prompt<
  Id extends string = string,
  Optionals extends string = never,
  Variants extends string = never,
> = {
  id: Id;
  _state: PromptBuilderState;
  variantNames: readonly Variants[];
  toString: ToStringOptions<
    Optionals,
    Id extends keyof PromptVariables ? PromptVariables[Id] : never,
    Variants | VariantsFor<Id>
  >;
};

// Generated prompt stores texts keyed by variant name (or "default" for base)
export type GeneratedPrompt = {
  variants: Record<string, string>;
  hash: string;
};
