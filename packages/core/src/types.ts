import type { BaseStep } from "./create-step.js";

export type PromptVariant = {
  name: string;
  steps: BaseStep[];
};

export type PromptBuilderState = {
  steps: BaseStep[];
  variants?: PromptVariant[];
};
