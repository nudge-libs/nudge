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
  PromptVariables,
  StepType,
} from "./types.js";

// Cache for generated prompts, populated by registerPrompts()
let promptCache: Record<string, GeneratedPrompt> = {};

function registerPrompts(prompts: Record<string, GeneratedPrompt>): void {
  promptCache = { ...promptCache, ...prompts };
}

function processTemplate(
  text: string,
  options: Record<string, string | boolean> = {},
): string {
  // Recursively process optional blocks (handles nesting)
  const processOptionals = (str: string): string =>
    str.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, name, content) =>
      options[name] ? processOptionals(content) : "",
    );

  // Replace variables {{name}} (not #name or /name)
  const processVars = (str: string): string =>
    str.replace(/\{\{(?![#\/])(\w+)\}\}/g, (match, name) => {
      const value = options[name];
      return typeof value === "string" ? value : match;
    });

  return processVars(processOptionals(text)).replace(/\n{3,}/g, "\n\n");
}

function prompt<Id extends string, Optionals extends string = never>(
  id: Id,
  promptFunc: (p: PromptBuilder) => PromptBuilder<Optionals>,
): Prompt<Id, Optionals> {
  const { builder, state } = createBuilder();
  promptFunc(builder);

  return {
    id,
    _state: state,
    toString: ((options?: Record<string, string | boolean>): string => {
      const text = promptCache[id]?.text ?? "";
      return processTemplate(text, options).trim();
    }) as Prompt<Id, Optionals>["toString"],
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
  type PromptVariables,
  type StepType,
};
