import type { BaseStep } from "./create-step.js";

export type PromptVariant = {
  name: string;
  steps: BaseStep[];
};

/** A test case for evaluating prompt quality */
export type PromptTest = {
  /** Input to send to the AI with this prompt */
  input: string;
  /** Function to validate the output, or string for LLM judge assertion */
  assert: ((output: string) => boolean) | string;
  /** Optional description of what this test checks */
  description?: string;
};

export type PromptBuilderState = {
  steps: BaseStep[];
  variants?: PromptVariant[];
  tests?: PromptTest[];
};
