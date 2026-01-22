type RawStep = { type: "raw"; value: string };
type PersonaStep = { type: "persona"; role: string };

type PromptStep = RawStep | PersonaStep;
type PromptBuilderState = PromptStep[];

type PromptBuilder = {
  raw: (value: string) => PromptBuilder;
  persona: (role: string) => PromptBuilder;
};

// Empty interface - augmented by generated file
interface PromptRegistry {}

type PromptId = keyof PromptRegistry;

type Prompt<Id extends string = string> = {
  id: Id;
  _state: PromptBuilderState;
  toString: () => string;
};

type GeneratedPrompt = { text: string; hash: string };

// Cache for generated prompts, populated by registerPrompts()
let promptCache: Record<string, GeneratedPrompt> = {};

function registerPrompts(prompts: Record<string, GeneratedPrompt>): void {
  promptCache = { ...promptCache, ...prompts };
}

function createBuilder(): {
  builder: PromptBuilder;
  state: PromptBuilderState;
} {
  const state: PromptBuilderState = [];

  const builder: PromptBuilder = {
    raw(value: string): PromptBuilder {
      state.push({ type: "raw", value });
      return builder;
    },
    persona(role: string): PromptBuilder {
      state.push({ type: "persona", role });
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
    toString: (): string => {
      return promptCache[id]?.text ?? "";
    },
  };
}

export {
  prompt,
  registerPrompts,
  type GeneratedPrompt,
  type Prompt,
  type PromptBuilder,
  type PromptBuilderState,
  type PromptId,
  type PromptRegistry,
  type PromptStep,
};
