import type { PromptTest } from "@nudge-ai/core/internal";
import "dotenv/config";
import * as fs from "fs";
import type { AIConfig } from "./ai.js";
import { loadExistingPrompts } from "./cache.js";
import { discoverPrompts } from "./discover.js";
import { evaluateVariant, type TestResult } from "./eval.js";
import {
  applyPromptChanges,
  requestImprovement,
  type FailingTestInfo,
  type PromptChange,
  type SourceHint,
} from "./improve-ai.js";

export type ImproveOptions = {
  promptIds?: string[]; // Filter to specific prompts
  maxIterations: number;
  verbose: boolean;
  judge: boolean;
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

export type ImprovementResult = {
  promptId: string;
  variantName: string;
  iterations: number;
  initialFailures: number;
  finalFailures: number;
  sourceHints: SourceHint[];
  status: "improved" | "plateau" | "max_iterations";
};

function escapeForTemplateLiteral(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

function updatePromptsGenFile(
  outputPath: string,
  promptId: string,
  variantName: string,
  newPromptText: string,
): void {
  const content = fs.readFileSync(outputPath, "utf-8");
  const escaped = escapeForTemplateLiteral(newPromptText);

  // Match: "variantName": `...content with possible escaped backticks...`
  const variantKey = JSON.stringify(variantName);
  const escapedVariantKey = variantKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // (?:[^`\\]|\\.)* matches: non-backtick non-backslash chars OR any escaped char
  const variantRegex = new RegExp(
    `(${escapedVariantKey}:\\s*)\`(?:[^\`\\\\]|\\\\.)*\``,
    "gs",
  );

  const promptKey = JSON.stringify(promptId);
  const promptSectionRegex = new RegExp(
    `${promptKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\s*\\{[\\s\\S]*?\\n  \\}`,
    "g",
  );

  const newContent = content.replace(promptSectionRegex, (promptSection) => {
    return promptSection.replace(variantRegex, `$1\`${escaped}\``);
  });

  fs.writeFileSync(outputPath, newContent, "utf-8");
}

function formatPromptChange(change: PromptChange): string {
  const actionSymbol =
    change.action === "add" ? "+" : change.action === "modify" ? "~" : "-";
  const actionLabel =
    change.action === "add"
      ? "Added"
      : change.action === "modify"
        ? "Modified"
        : "Removed";

  if (change.action === "modify" && change.original) {
    return `  ${actionSymbol} ${actionLabel}: "${change.original.slice(0, 50)}${change.original.length > 50 ? "..." : ""}" → "${change.replacement.slice(0, 50)}${change.replacement.length > 50 ? "..." : ""}"`;
  }

  return `  ${actionSymbol} ${actionLabel}: "${change.replacement.slice(0, 60)}${change.replacement.length > 60 ? "..." : ""}"`;
}

function formatSourceHints(hints: SourceHint[], promptId: string): string {
  if (hints.length === 0) return "";

  const lines = [
    `\n💡 Source Hint: Consider these changes in ${promptId}.prompt.ts:`,
  ];

  for (const hint of hints) {
    lines.push(`   ${hint.action}: ${hint.suggestion}`);
    lines.push(`      Reason: ${hint.reason}`);
  }

  return lines.join("\n");
}

function getAssertionString(test: PromptTest): string {
  if (typeof test.assert === "function") {
    return test.assert.toString();
  }
  return test.assert;
}

function resultsAreSame(prev: TestResult[], current: TestResult[]): boolean {
  if (prev.length !== current.length) return false;

  const prevFailing = prev
    .filter((r) => !r.passed)
    .map((r) => r.input)
    .sort();
  const currFailing = current
    .filter((r) => !r.passed)
    .map((r) => r.input)
    .sort();

  if (prevFailing.length !== currFailing.length) return false;

  return prevFailing.every((input, i) => input === currFailing[i]);
}

async function improveVariant(
  promptId: string,
  variantName: string,
  currentPrompt: string,
  tests: PromptTest[],
  config: AIConfig,
  options: ImproveOptions,
  outputPath: string,
): Promise<ImprovementResult> {
  let prompt = currentPrompt;
  const allSourceHints: SourceHint[] = [];

  let evaluation = await evaluateVariant(
    promptId,
    variantName,
    prompt,
    tests,
    config,
    options.judge,
  );

  const initialFailures = evaluation.failed;

  if (initialFailures === 0) {
    return {
      promptId,
      variantName,
      iterations: 0,
      initialFailures: 0,
      finalFailures: 0,
      sourceHints: [],
      status: "improved",
    };
  }

  let previousResults = evaluation.results;

  for (let i = 0; i < options.maxIterations; i++) {
    options.onIterationStart?.(promptId, variantName, i + 1);

    const failingResults = evaluation.results.filter((r) => !r.passed);

    // Build failing test info for AI
    const failingTestInfos: FailingTestInfo[] = failingResults.map((r) => {
      const test = tests.find((t) => t.input === r.input);
      return {
        input: r.input,
        output: r.output,
        assertion: test ? getAssertionString(test) : "unknown",
        reason: r.reason,
        description: r.description,
      };
    });

    // Request improvement from AI
    const suggestion = await requestImprovement(
      prompt,
      failingTestInfos,
      config,
      options.verbose,
    );
    allSourceHints.push(...suggestion.sourceHints);

    if (suggestion.promptChanges.length === 0) {
      const result: ImprovementResult = {
        promptId,
        variantName,
        iterations: i + 1,
        initialFailures,
        finalFailures: evaluation.failed,
        sourceHints: allSourceHints,
        status: "plateau",
      };
      options.onIterationDone?.(promptId, variantName, result);
      return result;
    }

    // Apply changes
    prompt = applyPromptChanges(prompt, suggestion.promptChanges);

    // Update the generated file
    updatePromptsGenFile(outputPath, promptId, variantName, prompt);

    // Re-evaluate
    evaluation = await evaluateVariant(
      promptId,
      variantName,
      prompt,
      tests,
      config,
      options.judge,
    );

    if (evaluation.failed === 0) {
      const result: ImprovementResult = {
        promptId,
        variantName,
        iterations: i + 1,
        initialFailures,
        finalFailures: 0,
        sourceHints: allSourceHints,
        status: "improved",
      };
      options.onIterationDone?.(promptId, variantName, result);
      return result;
    }

    // Check for plateau
    if (resultsAreSame(previousResults, evaluation.results)) {
      const result: ImprovementResult = {
        promptId,
        variantName,
        iterations: i + 1,
        initialFailures,
        finalFailures: evaluation.failed,
        sourceHints: allSourceHints,
        status: "plateau",
      };
      options.onIterationDone?.(promptId, variantName, result);
      return result;
    }

    previousResults = evaluation.results;
  }

  const result: ImprovementResult = {
    promptId,
    variantName,
    iterations: options.maxIterations,
    initialFailures,
    finalFailures: evaluation.failed,
    sourceHints: allSourceHints,
    status: "max_iterations",
  };
  options.onIterationDone?.(promptId, variantName, result);
  return result;
}

export async function improve(
  targetDir: string,
  outputPath: string,
  options: ImproveOptions & {
    aiConfig: AIConfig;
    promptFilenamePattern?: string;
  },
): Promise<ImprovementResult[]> {
  const pattern = options.promptFilenamePattern ?? "**/*.prompt.{ts,js}";
  const prompts = await discoverPrompts(targetDir, pattern);

  const existingPrompts = loadExistingPrompts(outputPath);

  if (Object.keys(existingPrompts).length === 0) {
    throw new Error(
      "No generated prompts found. Run 'npx nudge generate' first.",
    );
  }

  // Filter to prompts that have tests
  let promptsWithTests = prompts.filter(
    (p) => p.state.tests && p.state.tests.length > 0,
  );

  // Filter by specific prompt IDs if provided
  if (options.promptIds && options.promptIds.length > 0) {
    promptsWithTests = promptsWithTests.filter((p) =>
      options.promptIds!.includes(p.id),
    );
  }

  if (promptsWithTests.length === 0) {
    throw new Error("No prompts with tests found.");
  }

  const results: ImprovementResult[] = [];

  for (const prompt of promptsWithTests) {
    const existing = existingPrompts[prompt.id];
    if (!existing) {
      continue;
    }

    const tests = prompt.state.tests as PromptTest[];

    for (const [variantName, text] of Object.entries(existing.variants)) {
      const result = await improveVariant(
        prompt.id,
        variantName,
        text as string,
        tests,
        options.aiConfig,
        options,
        outputPath,
      );

      results.push(result);
    }
  }

  return results;
}
