import type { PromptTest } from "@nudge-ai/core/internal";
import * as z from "zod/mini";
import type { AIConfig } from "./ai.js";
import { formatAPIError } from "./errors.js";

export type TestResult = {
  input: string;
  output: string;
  passed: boolean;
  description?: string;
  reason?: string; // Why it failed (for judge assertions)
};

export type VariantEvaluation = {
  promptId: string;
  variantName: string;
  results: TestResult[];
  passed: number;
  failed: number;
  total: number;
  successRate: number;
};

export type PromptEvaluation = {
  promptId: string;
  variants: VariantEvaluation[];
  overallSuccessRate: number;
};

const ChatCompletionResponse = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string(),
      }),
    }),
  ),
});

const JudgeResponse = z.object({
  passed: z.boolean(),
  reason: z.string(),
});

const PROVIDER_BASE_URLS: Record<"openai" | "openrouter", string> = {
  openai: "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
};

const JUDGE_SYSTEM_PROMPT = `You are evaluating whether an AI's output meets a specific assertion.

You will receive:
1. The input that was given to the AI
2. The AI's output
3. An assertion describing what the output should do/contain

Evaluate whether the output satisfies the assertion. Be strict but fair.

Respond in JSON format:
{
  "passed": true/false,
  "reason": "Brief explanation of why it passed or failed"
}`;

async function callAI(
  systemPrompt: string,
  userMessage: string,
  config: AIConfig,
): Promise<string> {
  let baseUrl: string;
  if (config.baseUrl) {
    baseUrl = config.baseUrl;
  } else if (config.provider === "local") {
    throw new Error("Local provider requires baseUrl");
  } else {
    baseUrl = PROVIDER_BASE_URLS[config.provider];
  }

  let apiKey: string | undefined;
  if (config.apiKeyEnvVar) {
    apiKey = process.env[config.apiKeyEnvVar];
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      formatAPIError(
        new Error(`${response.status} - ${errorText}`),
        { model: config.model, operation: "running evaluation" },
      ),
    );
  }

  let data;
  try {
    data = ChatCompletionResponse.parse(await response.json());
  } catch (e) {
    throw new Error(
      formatAPIError(e, { model: config.model, operation: "running evaluation" }),
    );
  }

  return data.choices[0]?.message.content ?? "";
}

async function runJudge(
  input: string,
  output: string,
  assertion: string,
  config: AIConfig,
): Promise<{ passed: boolean; reason: string }> {
  const userMessage = `## Input given to AI
${input}

## AI's Output
${output}

## Assertion to check
${assertion}`;

  const response = await callAI(JUDGE_SYSTEM_PROMPT, userMessage, config);

  // Extract JSON from response
  const jsonMatch =
    response.match(/```json\s*([\s\S]*?)\s*```/) ||
    response.match(/```\s*([\s\S]*?)\s*```/) || [null, response];
  const jsonStr = jsonMatch[1] || response;

  try {
    return JudgeResponse.parse(JSON.parse(jsonStr));
  } catch {
    // If parsing fails, try to infer from response
    const lowerResponse = response.toLowerCase();
    const passed =
      lowerResponse.includes('"passed": true') ||
      lowerResponse.includes('"passed":true') ||
      lowerResponse.includes("passed: true");
    const failed =
      lowerResponse.includes('"passed": false') ||
      lowerResponse.includes('"passed":false') ||
      lowerResponse.includes("passed: false");

    if (!passed && !failed) {
      // Model didn't return anything we can parse
      return {
        passed: false,
        reason: `Judge model didn't return valid JSON. Consider using a more capable model. Response: "${response.slice(0, 100)}${response.length > 100 ? "..." : ""}"`,
      };
    }

    return { passed, reason: "Inferred from non-JSON response" };
  }
}

export async function runTest(
  systemPrompt: string,
  test: PromptTest,
  config: AIConfig,
  useJudge: boolean,
): Promise<TestResult> {
  // Run the prompt with the test input
  const output = await callAI(systemPrompt, test.input, config);

  let passed: boolean;
  let reason: string | undefined;

  if (typeof test.assert === "function") {
    // Function assertion - run directly
    try {
      passed = test.assert(output);
      if (!passed) {
        reason = "Assertion function returned false";
      }
    } catch (e) {
      passed = false;
      reason = `Assertion threw: ${e}`;
    }
  } else {
    // String assertion - use judge if enabled, otherwise skip
    if (useJudge) {
      const judgeResult = await runJudge(
        test.input,
        output,
        test.assert,
        config,
      );
      passed = judgeResult.passed;
      reason = judgeResult.reason;
    } else {
      // Can't evaluate string assertions without judge
      passed = true; // Mark as passed but note it wasn't evaluated
      reason = "String assertion skipped (use --judge to evaluate)";
    }
  }

  return {
    input: test.input,
    output,
    passed,
    description: test.description,
    reason,
  };
}

export async function evaluateVariant(
  promptId: string,
  variantName: string,
  systemPrompt: string,
  tests: PromptTest[],
  config: AIConfig,
  useJudge: boolean,
): Promise<VariantEvaluation> {
  const results: TestResult[] = [];

  for (const test of tests) {
    const result = await runTest(systemPrompt, test, config, useJudge);
    results.push(result);
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  return {
    promptId,
    variantName,
    results,
    passed,
    failed,
    total,
    successRate: total > 0 ? (passed / total) * 100 : 100,
  };
}

export function formatTestResult(
  result: TestResult,
  index: number,
  verbose: boolean = false,
): string {
  const status = result.passed ? "✓" : "✗";
  const desc = result.description || `Test ${index + 1}`;
  const lines = [`     ${status} ${desc}`];

  if (verbose) {
    // Show input (truncated if too long)
    const inputPreview =
      result.input.length > 80
        ? result.input.slice(0, 80) + "..."
        : result.input;
    lines.push(`       Input: "${inputPreview}"`);

    // Show LLM output
    const outputLines = result.output.split("\n");
    if (outputLines.length === 1 && result.output.length <= 100) {
      lines.push(`       Output: "${result.output}"`);
    } else {
      lines.push(`       Output:`);
      for (const line of outputLines.slice(0, 5)) {
        lines.push(`         ${line}`);
      }
      if (outputLines.length > 5) {
        lines.push(`         ... (${outputLines.length - 5} more lines)`);
      }
    }
  }

  if (!result.passed && result.reason) {
    lines.push(`       Reason: ${result.reason}`);
  }

  return lines.join("\n");
}

export function formatVariantEvaluation(
  evaluation: VariantEvaluation,
  verbose: boolean,
): string {
  const lines: string[] = [];
  const variant =
    evaluation.variantName === "default"
      ? ""
      : ` [${evaluation.variantName}]`;

  const statusIcon =
    evaluation.failed === 0 ? "✓" : evaluation.passed > 0 ? "◐" : "✗";

  lines.push(
    `  ${statusIcon} "${evaluation.promptId}"${variant} - ${evaluation.passed}/${evaluation.total} tests passed (${evaluation.successRate.toFixed(0)}%)`,
  );

  if (verbose && evaluation.results.length > 0) {
    for (let i = 0; i < evaluation.results.length; i++) {
      lines.push(formatTestResult(evaluation.results[i], i, verbose));
    }
  }

  return lines.join("\n");
}

export function formatEvaluationSummary(
  evaluations: VariantEvaluation[],
): string {
  const lines: string[] = [];
  lines.push("\n" + "─".repeat(60));

  const totalTests = evaluations.reduce((sum, e) => sum + e.total, 0);
  const totalPassed = evaluations.reduce((sum, e) => sum + e.passed, 0);
  const overallRate =
    totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(0) : "100";

  lines.push(`Total: ${totalPassed}/${totalTests} tests passed (${overallRate}%)`);

  // Find best and worst if multiple variants
  if (evaluations.length > 1) {
    const sorted = [...evaluations].sort(
      (a, b) => b.successRate - a.successRate,
    );
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    if (best.successRate !== worst.successRate) {
      const bestLabel =
        best.variantName === "default"
          ? best.promptId
          : `${best.promptId} [${best.variantName}]`;
      const worstLabel =
        worst.variantName === "default"
          ? worst.promptId
          : `${worst.promptId} [${worst.variantName}]`;

      lines.push(`Best:  "${bestLabel}" (${best.successRate.toFixed(0)}%)`);
      lines.push(`Worst: "${worstLabel}" (${worst.successRate.toFixed(0)}%)`);
    }
  }

  return lines.join("\n");
}
