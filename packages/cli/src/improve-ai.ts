import type { AIConfig } from "./ai.js";
import { formatAPIError } from "./errors.js";
import * as z from "zod/mini";

export type PromptChange = {
  action: "add" | "modify" | "remove";
  original?: string; // For modify/remove
  replacement: string; // For add/modify
  reason: string;
};

export type SourceHint = {
  stepType: string; // do, dont, constraint, etc.
  action: "add" | "modify" | "remove" | "adjust_nudge";
  suggestion: string; // Code snippet
  reason: string;
};

export type ImprovementSuggestion = {
  analysis: string; // Why tests are failing
  promptChanges: PromptChange[];
  sourceHints: SourceHint[]; // Suggested builder changes
  confidence: number; // 0-1
};

const PromptChangeSchema = z.object({
  action: z.enum(["add", "modify", "remove"]),
  original: z.optional(z.string()),
  replacement: z.string(),
  reason: z.string(),
});

const SourceHintSchema = z.object({
  stepType: z.string(),
  action: z.enum(["add", "modify", "remove", "adjust_nudge"]),
  suggestion: z.string(),
  reason: z.string(),
});

const ImprovementSuggestionSchema = z.object({
  analysis: z.string(),
  promptChanges: z.array(PromptChangeSchema),
  sourceHints: z.array(SourceHintSchema),
  confidence: z.number(),
});

const ChatCompletionResponse = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string(),
      }),
    }),
  ),
});

const PROVIDER_BASE_URLS: Record<"openai" | "openrouter", string> = {
  openai: "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
};

const IMPROVEMENT_SYSTEM_PROMPT = `You are an expert prompt engineer improving AI system prompts based on test failures.

## Input
1. Current system prompt text
2. Failing tests with: input, expected assertion, actual output, failure reason

## Your Task
1. Analyze why tests are failing
2. Suggest specific text modifications to the system prompt
3. Provide "source hints" - what builder step changes would help permanently

IMPORTANT: You MUST respond with ONLY a valid JSON object. No explanations, no markdown, just the JSON.

## Response Format
{
  "analysis": "Brief explanation of failure pattern",
  "promptChanges": [
    { "action": "add", "replacement": "new text to add to prompt", "reason": "why this helps" },
    { "action": "modify", "original": "exact text to find", "replacement": "replacement text", "reason": "why" },
    { "action": "remove", "original": "text to remove", "replacement": "", "reason": "why" }
  ],
  "sourceHints": [
    { "stepType": "dont", "action": "add", "suggestion": ".dont(\"add interpretive language\")", "reason": "prevents qualitative assessments" }
  ],
  "confidence": 0.85
}

## Guidelines
- Make minimal changes to fix failures without breaking passing tests
- For "add" actions, the replacement text will be appended to the prompt
- For "modify" actions, provide the EXACT original text to find (copy from the prompt)
- For sourceHints, suggest actual TypeScript code for .prompt.ts files
- Available step types: persona, context, input, output, do, dont, constraint, example, raw
- Nudge levels 1-5 control instruction strength (1=soft, 5=absolute)
- Be conservative - prefer small targeted changes over large rewrites

Output ONLY the JSON object, nothing else.`;

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
        { model: config.model, operation: "improving prompt" },
      ),
    );
  }

  let data;
  try {
    data = ChatCompletionResponse.parse(await response.json());
  } catch (e) {
    throw new Error(
      formatAPIError(e, { model: config.model, operation: "improving prompt" }),
    );
  }

  return data.choices[0]?.message.content ?? "";
}

export type FailingTestInfo = {
  input: string;
  output: string;
  assertion: string;
  reason?: string;
  description?: string;
};

export async function requestImprovement(
  currentPrompt: string,
  failingTests: FailingTestInfo[],
  config: AIConfig,
  verbose: boolean = false,
): Promise<ImprovementSuggestion> {
  const testsDescription = failingTests
    .map((t, i) => {
      return `### Test ${i + 1}${t.description ? ` (${t.description})` : ""}
Input: ${t.input}
Assertion: ${t.assertion}
Actual Output: ${t.output}
Failure Reason: ${t.reason || "Assertion not satisfied"}`;
    })
    .join("\n\n");

  const userMessage = `## Current System Prompt
\`\`\`
${currentPrompt}
\`\`\`

## Failing Tests
${testsDescription}

Respond with ONLY a JSON object containing your analysis and suggested changes.`;

  const response = await callAI(IMPROVEMENT_SYSTEM_PROMPT, userMessage, config);

  // Extract JSON from response - try multiple patterns
  const jsonMatch =
    response.match(/```json\s*([\s\S]*?)\s*```/) ||
    response.match(/```\s*([\s\S]*?)\s*```/) ||
    response.match(/(\{[\s\S]*\})/) ||
    [null, response];
  const jsonStr = (jsonMatch[1] || response).trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return ImprovementSuggestionSchema.parse(parsed);
  } catch (e) {
    if (verbose) {
      console.log("\n  ⚠️  Model returned invalid JSON");
      console.log("  Raw AI response:");
      const lines = response.split("\n");
      for (const line of lines.slice(0, 15)) {
        console.log(`    ${line}`);
      }
      if (lines.length > 15) {
        console.log(`    ... (${lines.length - 15} more lines)`);
      }
      console.log(`\n  Parse error: ${e instanceof Error ? e.message : String(e)}`);
    } else {
      // Show a helpful hint even without verbose
      console.log("  ⚠️  Model returned invalid JSON. Use --verbose to see the raw response.");
    }
    console.log("  💡 Tip: The improve command works best with capable models (gpt-4o, claude-3.5-sonnet).\n");

    // Return a default suggestion if parsing fails
    return {
      analysis: "Model did not return valid JSON. Try using a more capable model.",
      promptChanges: [],
      sourceHints: [],
      confidence: 0,
    };
  }
}

export function applyPromptChanges(
  prompt: string,
  changes: PromptChange[],
): string {
  let result = prompt;

  for (const change of changes) {
    switch (change.action) {
      case "add":
        // Add at the end by default
        result = result.trim() + "\n\n" + change.replacement;
        break;
      case "modify":
        if (change.original && result.includes(change.original)) {
          result = result.replace(change.original, change.replacement);
        }
        break;
      case "remove":
        if (change.original) {
          result = result.replace(change.original, "");
        }
        break;
    }
  }

  return result.trim();
}
