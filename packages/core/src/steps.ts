// Nudge levels for instructions (1 = gentlest, 5 = strongest)
export type Nudge = 1 | 2 | 3 | 4 | 5;

// Step types
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

export type PromptStep =
  | RawStep
  | PersonaStep
  | InputStep
  | OutputStep
  | ContextStep
  | DoStep
  | DontStep
  | ConstraintStep
  | ExampleStep;

export type StepType = PromptStep["type"];

function formatNudge(nudge?: Nudge): string {
  if (!nudge || nudge === 3) return "";
  return `\nNudge: ${nudge}`;
}

// Format step for AI consumption - each case returns the full formatted output
export function formatStepForAI(step: PromptStep): string {
  switch (step.type) {
    case "raw":
      return `[Raw Text] (Include this text verbatim in the system prompt.)\nValue: "${step.value}"`;
    case "persona":
      return `[Persona] (Define the identity and role the AI should assume. Frame this as 'You are...' at the start of the system prompt.)\nValue: "${step.role}"`;
    case "input":
      return `[Input] (Describe what input the AI will receive from the user. Help the AI understand the context of what it will be working with.)\nValue: "${step.description}"`;
    case "output":
      return `[Output] (Specify what the AI should produce as output. Be clear about the expected format and content.)\nValue: "${step.description}"`;
    case "context":
      return `[Context] (Background information or context that helps the AI understand the situation. This is not an instruction, just helpful information.)\nValue: "${step.information}"`;
    case "do":
      return `[Do] (A positive instruction the AI must follow.)\nValue: "${step.instruction}"${formatNudge(step.nudge)}`;
    case "dont":
      return `[Don't] (A negative instruction - something the AI must avoid.)\nValue: "${step.instruction}"${formatNudge(step.nudge)}`;
    case "constraint":
      return `[Constraint] (A rule or limitation the AI must respect.)\nValue: "${step.rule}"${formatNudge(step.nudge)}`;
    case "example":
      return `[Example] (An input/output example showing the AI how to respond. Use these to demonstrate the expected behavior.)\nInput: "${step.input}"\nExpected output: "${step.output}"`;
  }
}
