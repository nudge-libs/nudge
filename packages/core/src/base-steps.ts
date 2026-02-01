import { createStep, type BaseStep, type Nudge } from "./create-step.js";

// ============================================================================
// Step Types
// ============================================================================

export type RawStep = { type: "raw"; value: string };
export type PersonaStep = { type: "persona"; role: string };
export type InputStep = { type: "input"; description: string };
export type OutputStep = { type: "output"; description: string };
export type ContextStep = { type: "context"; information: string };
export type DoStep = { type: "do"; instruction: string; nudge?: Nudge };
export type DontStep = { type: "dont"; instruction: string; nudge?: Nudge };
export type ConstraintStep = {
  type: "constraint";
  rule: string;
  nudge?: Nudge;
};
export type ExampleStep = { type: "example"; input: string; output: string };

// Built-in special step types (handled by builder, not extensible)
export type OptionalStep = {
  type: "optional";
  name: string;
  steps: BaseStep[];
};

// Union of all built-in step types
export type BuiltInStep =
  | RawStep
  | PersonaStep
  | InputStep
  | OutputStep
  | ContextStep
  | DoStep
  | DontStep
  | ConstraintStep
  | ExampleStep
  | OptionalStep;

// ============================================================================
// Format Helpers
// ============================================================================

function formatNudge(nudge?: Nudge): string {
  if (!nudge || nudge === 3) return "";
  return `\nNudge: ${nudge}`;
}

// ============================================================================
// Step Definitions
// ============================================================================

export const raw = createStep({
  name: "raw",
  build: (value: string) => ({ type: "raw" as const, value }),
  format: (step) =>
    `[Raw Text] (Include this text verbatim in the system prompt.)\nValue: "${step.value}"`,
});

export const persona = createStep({
  name: "persona",
  build: (role: string) => ({ type: "persona" as const, role }),
  format: (step) =>
    `[Persona] (Define the identity and role the AI should assume. Frame this as 'You are...' at the start of the system prompt.)\nValue: "${step.role}"`,
});

export const input = createStep({
  name: "input",
  build: (description: string) => ({ type: "input" as const, description }),
  format: (step) =>
    `[Input] (Describe what input the AI will receive from the user. Help the AI understand the context of what it will be working with.)\nValue: "${step.description}"`,
});

export const output = createStep({
  name: "output",
  build: (description: string) => ({ type: "output" as const, description }),
  format: (step) =>
    `[Output] (Specify what the AI should produce as output. Be clear about the expected format and content.)\nValue: "${step.description}"`,
});

export const context = createStep({
  name: "context",
  build: (information: string) => ({ type: "context" as const, information }),
  format: (step) =>
    `[Context] (Background information or context that helps the AI understand the situation. This is not an instruction, just helpful information.)\nValue: "${step.information}"`,
});

export const doStep = createStep({
  name: "do",
  build: (instruction: string, options?: { nudge?: Nudge }) => ({
    type: "do" as const,
    instruction,
    nudge: options?.nudge,
  }),
  format: (step) =>
    `[Do] (A positive instruction the AI must follow.)\nValue: "${step.instruction}"${formatNudge(step.nudge)}`,
});

export const dont = createStep({
  name: "dont",
  build: (instruction: string, options?: { nudge?: Nudge }) => ({
    type: "dont" as const,
    instruction,
    nudge: options?.nudge,
  }),
  format: (step) =>
    `[Don't] (A negative instruction - something the AI must avoid.)\nValue: "${step.instruction}"${formatNudge(step.nudge)}`,
});

export const constraint = createStep({
  name: "constraint",
  build: (rule: string, options?: { nudge?: Nudge }) => ({
    type: "constraint" as const,
    rule,
    nudge: options?.nudge,
  }),
  format: (step) =>
    `[Constraint] (A rule or limitation the AI must respect.)\nValue: "${step.rule}"${formatNudge(step.nudge)}`,
});

export const example = createStep({
  name: "example",
  build: (inputText: string, outputText: string) => ({
    type: "example" as const,
    input: inputText,
    output: outputText,
  }),
  format: (step) =>
    `[Example] (An input/output example showing the AI how to respond. Use these to demonstrate the expected behavior.)\nInput: "${step.input}"\nExpected output: "${step.output}"`,
});

// ============================================================================
// All base steps for easy import
// ============================================================================

export const baseSteps = [
  raw,
  persona,
  input,
  output,
  context,
  doStep,
  dont,
  constraint,
  example,
] as const;
