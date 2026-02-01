// Main API - what most users need
import { nudge, type DefaultPromptFn } from "./nudge.js";

/**
 * Create a prompt using the default builder with all base steps.
 * For custom steps, create your own builder with `createBuilder()`.
 */
export const prompt: DefaultPromptFn = nudge.prompt;

// For custom builders
export { createStep } from "./create-step.js";
export { createBuilder } from "./nudge.js";

// Types users may need
export type { StepDefinition } from "./create-step.js";
export type { Builder, Prompt } from "./nudge.js";
