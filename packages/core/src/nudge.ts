import { baseSteps, type OptionalStep } from "./base-steps.js";
import {
  type AnyStepDefinition,
  type BaseStep,
  type StepDefinition,
} from "./create-step.js";
import type { PromptBuilderState } from "./types.js";

// ============================================================================
// Type Helpers
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MethodFromDefinition<D, B> =
  D extends StepDefinition<string, infer Args, any>
    ? (...args: Args) => B
    : never;

// The prompt builder type with all step methods + built-in special methods
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExtractDef<
  Defs extends readonly AnyStepDefinition[],
  Name extends string,
> = Extract<Defs[number], { name: Name }>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PromptBuilder<
  Defs extends readonly AnyStepDefinition[],
  Optionals extends string = never,
  Variants extends string = never,
> = {
  // Map each step definition to a method
  [K in Defs[number] as K["name"]]: MethodFromDefinition<
    K,
    PromptBuilder<Defs, Optionals, Variants>
  >;
} & {
  // 'do' needs special handling (reserved keyword) - extract the specific definition
  do: ExtractDef<Defs, "do"> extends StepDefinition<"do", infer Args, any>
    ? (...args: Args) => PromptBuilder<Defs, Optionals, Variants>
    : never;
  // Built-in special methods (always available)
  use: (source: {
    _state: PromptBuilderState;
  }) => PromptBuilder<Defs, Optionals, Variants>;
  optional: <Name extends string>(
    name: Name,
    builderFn: (p: PromptBuilder<Defs>) => PromptBuilder<Defs>,
  ) => PromptBuilder<Defs, Optionals | Name, Variants>;
  variant: <Name extends string>(
    name: Name,
    builderFn: (p: PromptBuilder<Defs>) => PromptBuilder<Defs>,
  ) => PromptBuilder<Defs, Optionals, Variants | Name>;
};

// ============================================================================
// Builder Type
// ============================================================================

/** Type for the default builder's prompt function */
export type DefaultPromptFn = <
  Id extends string,
  Optionals extends string = never,
  Variants extends string = never,
>(
  id: Id,
  builderFn: (
    p: PromptBuilder<typeof baseSteps>,
  ) => PromptBuilder<typeof baseSteps, Optionals, Variants>,
) => Prompt<Id, Optionals, Variants>;

export type Builder<
  Defs extends readonly AnyStepDefinition[] = readonly AnyStepDefinition[],
> = {
  /** Create a prompt using this builder's available steps. */
  prompt: <
    Id extends string,
    Optionals extends string = never,
    Variants extends string = never,
  >(
    id: Id,
    builderFn: (
      p: PromptBuilder<Defs>,
    ) => PromptBuilder<Defs, Optionals, Variants>,
  ) => Prompt<Id, Optionals, Variants>;
};

export type Prompt<
  Id extends string = string,
  Optionals extends string = never,
  Variants extends string = never,
> = {
  id: Id;
  _state: PromptBuilderState;
  variantNames: readonly Variants[];
  toString: ToStringOptions<Id, Optionals, Variants>;
};

// ============================================================================
// ToString Type Helpers
// ============================================================================

export interface PromptRegistry {}
export interface PromptVariables {}
export interface PromptVariants {}

type VariantsFor<Id extends string> = Id extends keyof PromptVariants
  ? PromptVariants[Id]
  : never;

type VariantOption<V extends string> = [V] extends [never]
  ? { variant?: never }
  : { variant?: V };

type ToStringOptions<
  Id extends string,
  Optionals extends string,
  Variants extends string,
> = Id extends keyof PromptVariables
  ? [PromptVariables[Id]] extends [never]
    ? [Optionals] extends [never]
      ? (options?: VariantOption<Variants | VariantsFor<Id>>) => string
      : (
          options?: Partial<Record<Optionals, boolean>> &
            VariantOption<Variants | VariantsFor<Id>>,
        ) => string
    : [Optionals] extends [never]
      ? (
          options: Record<PromptVariables[Id] & string, string> &
            VariantOption<Variants | VariantsFor<Id>>,
        ) => string
      : (
          options: Record<PromptVariables[Id] & string, string> &
            Partial<Record<Optionals, boolean>> &
            VariantOption<Variants | VariantsFor<Id>>,
        ) => string
  : [Optionals] extends [never]
    ? (options?: VariantOption<Variants>) => string
    : (
        options?: Partial<Record<Optionals, boolean>> & VariantOption<Variants>,
      ) => string;

// ============================================================================
// Prompt Cache
// ============================================================================

export type GeneratedPrompt = {
  variants: Record<string, string>;
  hash: string;
};

let promptCache: Record<string, GeneratedPrompt> = {};

export function registerPrompts(
  prompts: Record<string, GeneratedPrompt>,
): void {
  promptCache = { ...promptCache, ...prompts };
}

function processTemplate(
  text: string,
  options: Record<string, string | boolean> = {},
): string {
  const processOptionals = (str: string): string =>
    str.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, name, content) =>
      options[name] ? processOptionals(content) : "",
    );
  const processVars = (str: string): string =>
    str.replace(/\{\{(?![#\/])(\w+)\}\}/g, (match, name) => {
      const value = options[name];
      return typeof value === "string" ? value : match;
    });
  return processVars(processOptionals(text)).replace(/\n{3,}/g, "\n\n");
}

// ============================================================================
// Format Step for AI (standalone utility)
// ============================================================================

const baseStepDefinitions = new Map<string, AnyStepDefinition>();
for (const def of baseSteps) {
  baseStepDefinitions.set(def.name, def);
}

/** Format a step for AI consumption using the base step definitions. */
export function formatStepForAI(step: BaseStep): string {
  if (step.type === "optional") {
    const opt = step as OptionalStep;
    const inner = opt.steps.map(formatStepForAI).join("\n\n");
    return `[Optional Block Start: "${opt.name}"] (The following instructions are OPTIONAL. Wrap the generated content for these in {{#${opt.name}}}...{{/${opt.name}}} markers so it can be toggled at runtime.)\n\n${inner}\n\n[Optional Block End: "${opt.name}"]`;
  }
  const def = baseStepDefinitions.get(step.type);
  if (!def) return `[Unknown Step: ${step.type}]`;
  return def.format(step);
}

// ============================================================================
// Create Builder
// ============================================================================

export interface CreateBuilderOptions<OmitBase extends boolean = false> {
  /** If true, only use the provided steps without including base steps. Default: false */
  omitBaseSteps?: OmitBase;
}

// Overload: with omitBaseSteps: true, only custom steps are available
export function createBuilder<Defs extends readonly AnyStepDefinition[]>(
  customSteps: Defs,
  options: CreateBuilderOptions<true>,
): Builder<Defs>;

// Overload: default behavior includes base steps
export function createBuilder<
  Defs extends readonly AnyStepDefinition[] = readonly [],
>(
  customSteps?: Defs,
  options?: CreateBuilderOptions<false>,
): Builder<readonly [...typeof baseSteps, ...Defs]>;

// Implementation
export function createBuilder<
  Defs extends readonly AnyStepDefinition[] = readonly [],
>(
  customSteps: Defs = [] as unknown as Defs,
  options: CreateBuilderOptions<boolean> = {},
): Builder<readonly AnyStepDefinition[]> {
  const { omitBaseSteps = false } = options;
  const allDefs = omitBaseSteps ? customSteps : [...baseSteps, ...customSteps];

  const definitions = new Map<string, AnyStepDefinition>();
  for (const def of allDefs) {
    definitions.set(def.name, def);
  }

  // Create the inner prompt builder
  function createPromptBuilder(
    state: PromptBuilderState,
  ): Record<string, unknown> {
    const builder: Record<string, unknown> = {};

    // Add methods for each step definition
    for (const [name, def] of definitions) {
      builder[name] = (...args: unknown[]) => {
        state.steps.push(def.build(...args));
        return builder;
      };
    }

    // Built-in: use
    builder.use = (source: { _state: PromptBuilderState }) => {
      state.steps.push(...source._state.steps);
      return builder;
    };

    // Built-in: optional
    builder.optional = (name: string, builderFn: (p: unknown) => unknown) => {
      const innerState: PromptBuilderState = { steps: [] };
      const innerBuilder = createPromptBuilder(innerState);
      builderFn(innerBuilder);
      state.steps.push({
        type: "optional",
        name,
        steps: innerState.steps,
      } as BaseStep);
      return builder;
    };

    // Built-in: variant
    builder.variant = (name: string, builderFn: (p: unknown) => unknown) => {
      const innerState: PromptBuilderState = { steps: [] };
      const innerBuilder = createPromptBuilder(innerState);
      builderFn(innerBuilder);
      if (!state.variants) state.variants = [];
      state.variants.push({ name, steps: innerState.steps });
      return builder;
    };

    return builder;
  }

  // Format a step for AI consumption
  function formatStep(step: BaseStep): string {
    if (step.type === "optional") {
      const opt = step as OptionalStep;
      const inner = opt.steps.map(formatStep).join("\n\n");
      return `[Optional Block Start: "${opt.name}"] (The following instructions are OPTIONAL. Wrap the generated content for these in {{#${opt.name}}}...{{/${opt.name}}} markers so it can be toggled at runtime.)\n\n${inner}\n\n[Optional Block End: "${opt.name}"]`;
    }
    const def = definitions.get(step.type);
    if (!def) return `[Unknown Step: ${step.type}]`;
    return def.format(step);
  }

  return {
    prompt: <
      Id extends string,
      Optionals extends string = never,
      Variants extends string = never,
    >(
      id: Id,
      builderFn: (
        p: PromptBuilder<Defs>,
      ) => PromptBuilder<Defs, Optionals, Variants>,
    ): Prompt<Id, Optionals, Variants> => {
      const state: PromptBuilderState = { steps: [] };
      const builder = createPromptBuilder(state);
      builderFn(builder as PromptBuilder<Defs>);

      return {
        id,
        _state: state,
        variantNames: (state.variants?.map((v) => v.name) ?? []) as Variants[],
        toString: ((options?: Record<string, string | boolean>) => {
          const cached = promptCache[id];
          if (!cached) return "";
          const variantName = (options?.variant as string) ?? "default";
          const text =
            cached.variants[variantName] ?? cached.variants["default"] ?? "";
          return processTemplate(text, options).trim();
        }) as Prompt<Id, Optionals, Variants>["toString"],
      };
    },
  };
}

// ============================================================================
// Default Builder
// ============================================================================

export const nudge = createBuilder(baseSteps, { omitBaseSteps: true });

export type DefaultBuilder = PromptBuilder<typeof baseSteps>;
