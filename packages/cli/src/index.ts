import type { BaseStep, PromptTest } from "@nudge-ai/core/internal";
import "dotenv/config";
import * as fs from "fs";
import { processPrompt, type AIConfig } from "./ai.js";
import { hashState, loadExistingPrompts } from "./cache.js";
import { discoverPrompts, type DiscoveredPrompt } from "./discover.js";
import { evaluateVariant, type VariantEvaluation } from "./eval.js";
import {
  improve as improvePrompts,
  type ImproveOptions as BaseImproveOptions,
  type ImprovementResult,
} from "./improve.js";

export type GenerateOptions = {
  promptFilenamePattern?: string;
  aiConfig?: AIConfig;
  noCache?: boolean;
  // Callbacks for Ink UI
  onPromptStart?: (id: string, variantCount: number) => void;
  onPromptCached?: (id: string) => void;
  onPromptDone?: (id: string, variantCount: number) => void;
  onPromptError?: (id: string, error: Error) => void;
};

function escapeForTemplateLiteral(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

function extractVariables(variants: Record<string, string>): string[] {
  const allVars = new Set<string>();
  for (const text of Object.values(variants)) {
    for (const match of text.matchAll(/\{\{(?![#\/])(\w+)\}\}/g)) {
      allVars.add(match[1]);
    }
  }
  return [...allVars];
}

async function generate(
  targetDir: string,
  outputPath: string,
  options: GenerateOptions = {},
) {
  const pattern = options.promptFilenamePattern ?? "**/*.prompt.{ts,js}";
  const prompts = await discoverPrompts(targetDir, pattern);

  if (!options.aiConfig) {
    throw new Error("AI config is required in nudge.config.json");
  }

  const existingPrompts = loadExistingPrompts(outputPath);
  const results = [];

  for (const prompt of prompts) {
    const hash = hashState(prompt.state);
    const existing = existingPrompts[prompt.id];

    let variants: Record<string, string>;

    if (!options.noCache && existing && existing.hash === hash) {
      options.onPromptCached?.(prompt.id);
      variants = existing.variants as Record<string, string>;
    } else {
      const definedVariants = prompt.state.variants ?? [];
      const variantCount = definedVariants.length || 1;

      try {
        options.onPromptStart?.(prompt.id, variantCount);

        if (definedVariants.length === 0) {
          // No variants defined - generate single "default" prompt
          const text = await processPrompt(
            prompt.state.steps,
            options.aiConfig!,
            { silent: true },
          );
          variants = { default: text };
        } else {
          // Generate one prompt per variant (base steps + variant steps)
          const variantEntries: [string, string][] = [];
          for (let i = 0; i < definedVariants.length; i++) {
            const v = definedVariants[i];
            const combinedSteps: BaseStep[] = [
              ...prompt.state.steps,
              ...v.steps,
            ];
            const text = await processPrompt(combinedSteps, options.aiConfig!, {
              silent: true,
            });
            variantEntries.push([v.name, text]);
          }
          variants = Object.fromEntries(variantEntries);
        }

        options.onPromptDone?.(prompt.id, variantCount);
      } catch (error) {
        options.onPromptError?.(prompt.id, error as Error);
        throw error;
      }
    }

    const variables = extractVariables(variants);
    const variantNames = Object.keys(variants).filter((k) => k !== "default");

    const variantEntriesStr = Object.entries(variants)
      .map(([name, text]) => {
        const escaped = escapeForTemplateLiteral(text);
        return `      ${JSON.stringify(name)}: \`${escaped}\``;
      })
      .join(",\n");

    results.push({
      id: prompt.id,
      entry: `  ${JSON.stringify(prompt.id)}: {\n    variants: {\n${variantEntriesStr},\n    },\n    hash: ${JSON.stringify(hash)},\n  }`,
      registry: `    ${JSON.stringify(prompt.id)}: true;`,
      variables:
        variables.length > 0
          ? `    ${JSON.stringify(prompt.id)}: ${variables.map((v) => JSON.stringify(v)).join(" | ")};`
          : null,
      variantNames:
        variantNames.length > 0
          ? `    ${JSON.stringify(prompt.id)}: ${variantNames.map((v) => JSON.stringify(v)).join(" | ")};`
          : null,
    });
  }

  const promptEntries = results.map((r) => r.entry);
  const registryEntries = results.map((r) => r.registry);
  const variableEntries = results
    .map((r) => r.variables)
    .filter((v): v is string => v !== null);
  const variantEntries = results
    .map((r) => r.variantNames)
    .filter((v): v is string => v !== null);

  const variablesInterface =
    variableEntries.length > 0
      ? `\n  interface PromptVariables {\n${variableEntries.join("\n")}\n  }`
      : "";

  const variantsInterface =
    variantEntries.length > 0
      ? `\n  interface PromptVariants {\n${variantEntries.join("\n")}\n  }`
      : "";

  const code = `// This file is auto-generated by @nudge-ai/cli. Do not edit manually.
import { registerPrompts } from "@nudge-ai/core/internal";

declare module "@nudge-ai/core" {
  interface PromptRegistry {
${registryEntries.join("\n")}
  }${variablesInterface}${variantsInterface}
}

const prompts = {
${promptEntries.join(",\n")}
} as const;

registerPrompts(prompts);
`;

  // Write TypeScript file
  fs.writeFileSync(outputPath, code, "utf-8");
}

export type EvaluateOptions = {
  promptFilenamePattern?: string;
  aiConfig?: AIConfig;
  verbose?: boolean;
  judge?: boolean;
  // Callbacks for Ink UI
  onVariantStart?: (promptId: string, variantName: string) => void;
  onVariantDone?: (evaluation: VariantEvaluation) => void;
};

async function evaluate(
  targetDir: string,
  outputPath: string,
  options: EvaluateOptions = {},
): Promise<VariantEvaluation[]> {
  const pattern = options.promptFilenamePattern ?? "**/*.prompt.{ts,js}";
  const prompts = await discoverPrompts(targetDir, pattern);

  if (!options.aiConfig) {
    throw new Error("AI config is required in nudge.config.json");
  }

  const existingPrompts = loadExistingPrompts(outputPath);

  if (Object.keys(existingPrompts).length === 0) {
    throw new Error("No generated prompts found. Run 'nudge generate' first.");
  }

  // Filter to prompts that have tests
  const promptsWithTests = prompts.filter(
    (p) => p.state.tests && p.state.tests.length > 0,
  );

  if (promptsWithTests.length === 0) {
    throw new Error(
      "No prompts with tests found. Add tests using .test(input, assertion)",
    );
  }

  const evaluations: VariantEvaluation[] = [];

  for (const prompt of promptsWithTests) {
    const existing = existingPrompts[prompt.id];
    if (!existing) {
      continue;
    }

    const tests = prompt.state.tests as PromptTest[];

    for (const [variantName, text] of Object.entries(existing.variants)) {
      options.onVariantStart?.(prompt.id, variantName);

      const evaluation = await evaluateVariant(
        prompt.id,
        variantName,
        text as string,
        tests,
        options.aiConfig,
        options.judge ?? false,
      );
      evaluations.push(evaluation);

      options.onVariantDone?.(evaluation);
    }
  }

  return evaluations;
}

export type ImproveOptions = BaseImproveOptions & {
  aiConfig: AIConfig;
  promptFilenamePattern?: string;
  // Callbacks for Ink UI
  onIterationStart?: (
    promptId: string,
    variantName: string,
    iteration: number,
  ) => void;
  onIterationDone?: (
    promptId: string,
    variantName: string,
    result: ImprovementResult,
  ) => void;
};

async function improve(
  targetDir: string,
  outputPath: string,
  options: ImproveOptions,
): Promise<ImprovementResult[]> {
  return improvePrompts(targetDir, outputPath, options);
}

export {
  discoverPrompts,
  evaluate,
  generate,
  improve,
  type AIConfig,
  type DiscoveredPrompt,
  type ImprovementResult,
  type VariantEvaluation,
};
