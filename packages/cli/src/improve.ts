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
import { createSpinner } from "./status.js";

export type ImproveOptions = {
  promptIds?: string[]; // Filter to specific prompts
  maxIterations: number;
  verbose: boolean;
  judge: boolean;
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

  const lines = [`\n💡 Source Hint: Consider these changes in ${promptId}.prompt.ts:`];

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

function resultsAreSame(
  prev: TestResult[],
  current: TestResult[],
): boolean {
  if (prev.length !== current.length) return false;

  const prevFailing = prev.filter((r) => !r.passed).map((r) => r.input).sort();
  const currFailing = current.filter((r) => !r.passed).map((r) => r.input).sort();

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
  const variantLabel = variantName === "default" ? promptId : `${promptId} [${variantName}]`;

  const initialSpinner = createSpinner(`Running initial tests for "${variantLabel}"...`);
  let evaluation = await evaluateVariant(
    promptId,
    variantName,
    prompt,
    tests,
    config,
    options.judge,
    { silent: true },
  );
  initialSpinner.stop();

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
    const failingResults = evaluation.results.filter((r) => !r.passed);

    console.log(`\nIteration ${i + 1}/${options.maxIterations} for "${promptId}"${variantName !== "default" ? ` [${variantName}]` : ""}`);
    console.log("");

    // Print failing tests
    console.log("Failing Test(s):");
    for (const result of failingResults) {
      const test = tests.find((t) => t.input === result.input);
      console.log(`  Input: "${result.input.slice(0, 60)}${result.input.length > 60 ? "..." : ""}"`);
      if (test) {
        console.log(`  Expected: ${getAssertionString(test)}`);
      }
      console.log(`  Actual: "${result.output.slice(0, 60)}${result.output.length > 60 ? "..." : ""}"`);
      if (result.reason) {
        console.log(`  Reason: ${result.reason}`);
      }
      console.log("");
    }

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
    const aiSpinner = createSpinner(`Analyzing failures and generating improvements...`);
    const suggestion = await requestImprovement(prompt, failingTestInfos, config, options.verbose);
    aiSpinner.stop();
    allSourceHints.push(...suggestion.sourceHints);

    if (options.verbose) {
      console.log("Analysis:");
      console.log(`  ${suggestion.analysis}`);
      console.log("");
    }

    if (suggestion.promptChanges.length === 0) {
      console.log("No prompt changes suggested.");
      return {
        promptId,
        variantName,
        iterations: i + 1,
        initialFailures,
        finalFailures: evaluation.failed,
        sourceHints: allSourceHints,
        status: "plateau",
      };
    }

    console.log("Suggested Prompt Changes:");
    for (const change of suggestion.promptChanges) {
      console.log(formatPromptChange(change));
    }
    console.log("");

    // Apply changes
    prompt = applyPromptChanges(prompt, suggestion.promptChanges);

    // Update the generated file
    updatePromptsGenFile(outputPath, promptId, variantName, prompt);

    // Re-evaluate
    const rerunSpinner = createSpinner(`Re-running ${tests.length} test(s)...`);
    evaluation = await evaluateVariant(
      promptId,
      variantName,
      prompt,
      tests,
      config,
      options.judge,
      { silent: true },
    );
    rerunSpinner.stop();

    // Print test results
    for (const result of evaluation.results) {
      const prevResult = previousResults.find((r) => r.input === result.input);
      const wasFailingNowPassing = prevResult && !prevResult.passed && result.passed;
      const status = result.passed ? "✓" : "✗";
      const suffix = wasFailingNowPassing ? " (was failing)" : "";
      console.log(`  ${status} ${result.description || `Test: ${result.input.slice(0, 40)}...`}${suffix}`);
    }

    if (evaluation.failed === 0) {
      return {
        promptId,
        variantName,
        iterations: i + 1,
        initialFailures,
        finalFailures: 0,
        sourceHints: allSourceHints,
        status: "improved",
      };
    }

    // Check for plateau
    if (resultsAreSame(previousResults, evaluation.results)) {
      console.log("\nPlateau detected - same failures as before.");
      return {
        promptId,
        variantName,
        iterations: i + 1,
        initialFailures,
        finalFailures: evaluation.failed,
        sourceHints: allSourceHints,
        status: "plateau",
      };
    }

    previousResults = evaluation.results;
  }

  return {
    promptId,
    variantName,
    iterations: options.maxIterations,
    initialFailures,
    finalFailures: evaluation.failed,
    sourceHints: allSourceHints,
    status: "max_iterations",
  };
}

export async function improve(
  targetDir: string,
  outputPath: string,
  options: ImproveOptions & { aiConfig: AIConfig; promptFilenamePattern?: string },
): Promise<ImprovementResult[]> {
  const pattern = options.promptFilenamePattern ?? "**/*.prompt.{ts,js}";
  const prompts = await discoverPrompts(targetDir, pattern);

  const existingPrompts = loadExistingPrompts(outputPath);

  if (Object.keys(existingPrompts).length === 0) {
    console.log("No generated prompts found. Run 'npx nudge generate' first.");
    return [];
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
    console.log("No prompts with tests found.");
    if (options.promptIds && options.promptIds.length > 0) {
      console.log(`Filtered for: ${options.promptIds.join(", ")}`);
    }
    return [];
  }

  console.log("Analyzing prompts with failing tests...\n");
  console.log("━".repeat(60));

  const results: ImprovementResult[] = [];

  for (const prompt of promptsWithTests) {
    const existing = existingPrompts[prompt.id];
    if (!existing) {
      console.log(`\n⚠ "${prompt.id}" not found in generated file, skipping`);
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

      // Print source hints after each prompt
      const sourceHintsOutput = formatSourceHints(result.sourceHints, prompt.id);
      if (sourceHintsOutput) {
        console.log(sourceHintsOutput);
      }

      console.log("\n" + "━".repeat(60));
    }
  }

  // Print summary
  console.log("\nSummary:");

  for (const result of results) {
    const variant = result.variantName === "default" ? "" : ` [${result.variantName}]`;
    if (result.initialFailures === 0) {
      console.log(`  ✓ ${result.promptId}${variant}: all tests passing`);
    } else if (result.status === "improved") {
      console.log(`  ✓ ${result.promptId}${variant}: improved in ${result.iterations} iteration(s)`);
    } else if (result.status === "plateau") {
      console.log(`  ◐ ${result.promptId}${variant}: plateau at ${result.finalFailures} failure(s)`);
    } else {
      console.log(`  ✗ ${result.promptId}${variant}: ${result.finalFailures} failure(s) after ${result.iterations} iteration(s)`);
    }
  }

  const totalInitialFailures = results.reduce((sum, r) => sum + r.initialFailures, 0);
  const totalFinalFailures = results.reduce((sum, r) => sum + r.finalFailures, 0);
  const hasChanges = results.some((r) => r.iterations > 0);

  if (totalInitialFailures > 0) {
    console.log(`\nTotal: ${totalInitialFailures - totalFinalFailures} failure(s) fixed`);
  }

  if (hasChanges) {
    console.log("\n⚠️  Note: Changes are in prompts.gen.ts only.");
    console.log("    Run 'npx nudge generate' to reset, or apply source hints permanently.");
  }

  return results;
}
