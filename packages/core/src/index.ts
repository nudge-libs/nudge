// NOTE: temporary as string array, likely needs to be more complex later
type PromptBuilderState = string[];

type PromptBuilder = {
  raw: (value: string) => PromptBuilder;
};

// Empty interface - augmented by generated file
interface PromptRegistry {}

type PromptId = keyof PromptRegistry;

type Prompt<Id extends string = string> = {
  id: Id;
  _state: PromptBuilderState;
  toString: () => string;
};

// Cache for generated prompts, populated by registerPrompts()
let promptCache: Record<string, string> = {};

function registerPrompts(prompts: Record<string, string>): void {
  promptCache = { ...promptCache, ...prompts };
}

function createBuilder(): {
  builder: PromptBuilder;
  state: PromptBuilderState;
} {
  const state: PromptBuilderState = [];

  const builder: PromptBuilder = {
    raw(value: string) {
      state.push(value);
      return builder;
    },
  };

  return { builder, state };
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
    toString: () => {
      return promptCache[id] ?? state.join("\n");
    },
  };
}

export {
  prompt,
  registerPrompts,
  type Prompt,
  type PromptBuilder,
  type PromptBuilderState,
  type PromptId,
  type PromptRegistry,
};
