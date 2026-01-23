import type { Nudge } from "./steps.js";
import type { PromptBuilder, PromptBuilderState } from "./types.js";

export function createBuilder(targetState?: PromptBuilderState): {
  builder: PromptBuilder;
  state: PromptBuilderState;
} {
  const state: PromptBuilderState = targetState ?? [];

  const builder: PromptBuilder = {
    raw: (value) => (state.push({ type: "raw", value }), builder),
    persona: (role) => (state.push({ type: "persona", role }), builder),
    input: (description) => (
      state.push({ type: "input", description }),
      builder
    ),
    output: (description) => (
      state.push({ type: "output", description }),
      builder
    ),
    context: (information) => (
      state.push({ type: "context", information }),
      builder
    ),
    do: (instruction, options?: { nudge?: Nudge }) => (
      state.push({ type: "do", instruction, nudge: options?.nudge }),
      builder
    ),
    dont: (instruction, options?: { nudge?: Nudge }) => (
      state.push({ type: "dont", instruction, nudge: options?.nudge }),
      builder
    ),
    constraint: (rule, options?: { nudge?: Nudge }) => (
      state.push({ type: "constraint", rule, nudge: options?.nudge }),
      builder
    ),
    example: (input, output) => (
      state.push({ type: "example", input, output }),
      builder
    ),
    use: (source) => (state.push(...source._state), builder),
    optional: (name, builderFn) => {
      const optionalSteps: PromptBuilderState = [];
      const { builder: innerBuilder } = createBuilder(optionalSteps);
      builderFn(innerBuilder);
      state.push({ type: "optional", name, steps: optionalSteps });
      return builder;
    },
  };

  return { builder, state };
}
