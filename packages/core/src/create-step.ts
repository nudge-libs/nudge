// Nudge levels for instructions (1 = gentlest, 5 = strongest)
export type Nudge = 1 | 2 | 3 | 4 | 5;

// Base step shape - all steps have a type
export type BaseStep = { type: string };

// Step definition - defines how to build and format a step
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StepDefinition<
  Name extends string = string,
  Args extends any[] = any[],
  Step extends BaseStep = any,
> = {
  name: Name;
  build: (...args: Args) => Step;
  format: (step: Step) => string;
};

// Type alias for any step definition (used in arrays/maps)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyStepDefinition = StepDefinition<string, any[], any>;

/**
 * Creates a step definition that can be used to extend a builder.
 *
 * @example
 * ```ts
 * const tone = createStep({
 *   name: 'tone',
 *   build: (style: string) => ({ type: 'tone', style }),
 *   format: (step) => `[Tone] Write in a ${step.style} tone`,
 * });
 * ```
 */
export function createStep<
  Name extends string,
  Args extends unknown[],
  Step extends BaseStep & { type: Name },
>(
  definition: StepDefinition<Name, Args, Step>,
): StepDefinition<Name, Args, Step> {
  return definition;
}
