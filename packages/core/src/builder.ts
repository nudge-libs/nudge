import type { Nudge, PromptStep } from "./steps.js";
import type { PromptBuilder, PromptBuilderState } from "./types.js";

export function createBuilder(targetState?: PromptBuilderState): {
  builder: PromptBuilder;
  state: PromptBuilderState;
} {
  const state: PromptBuilderState = targetState ?? { steps: [] };

  const builder: PromptBuilder = {
    raw: (value) => (state.steps.push({ type: "raw", value }), builder),
    persona: (role) => (state.steps.push({ type: "persona", role }), builder),
    input: (description) => (
      state.steps.push({ type: "input", description }),
      builder
    ),
    output: (description) => (
      state.steps.push({ type: "output", description }),
      builder
    ),
    context: (information) => (
      state.steps.push({ type: "context", information }),
      builder
    ),
    do: (instruction, options?: { nudge?: Nudge }) => (
      state.steps.push({ type: "do", instruction, nudge: options?.nudge }),
      builder
    ),
    dont: (instruction, options?: { nudge?: Nudge }) => (
      state.steps.push({ type: "dont", instruction, nudge: options?.nudge }),
      builder
    ),
    constraint: (rule, options?: { nudge?: Nudge }) => (
      state.steps.push({ type: "constraint", rule, nudge: options?.nudge }),
      builder
    ),
    example: (input, output) => (
      state.steps.push({ type: "example", input, output }),
      builder
    ),
    use: (source) => (state.steps.push(...source._state.steps), builder),
    optional: (name, builderFn) => {
      const innerSteps: PromptStep[] = [];
      const { builder: innerBuilder } = createBuilder({ steps: innerSteps });
      builderFn(innerBuilder);
      state.steps.push({ type: "optional", name, steps: innerSteps });
      return builder;
    },
    variant: (name, builderFn) => {
      const variantSteps: PromptStep[] = [];
      const { builder: innerBuilder } = createBuilder({ steps: variantSteps });
      builderFn(innerBuilder);
      if (!state.variants) state.variants = [];
      state.variants.push({ name, steps: variantSteps });
      return builder;
    },
  };

  return { builder, state };
}
