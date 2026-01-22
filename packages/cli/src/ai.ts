import type { PromptStep } from "@nudge/core";
import * as z from "zod";

export type AIConfig = {
  provider: "openai" | "openrouter";
  apiKeyEnvVar: string;
  model: string;
};

const PROVIDER_BASE_URLS: Record<AIConfig["provider"], string> = {
  openai: "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
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

export async function processPrompt(
  steps: PromptStep[],
  config: AIConfig,
): Promise<string> {
  const apiKey = process.env[config.apiKeyEnvVar];
  if (!apiKey) {
    throw new Error(
      `Missing API key: environment variable "${config.apiKeyEnvVar}" is not set`,
    );
  }

  const baseUrl = PROVIDER_BASE_URLS[config.provider];

  const stepsDescription = steps
    .map((step) => {
      switch (step.type) {
        case "raw":
          return `[raw]: ${step.value}`;
        case "persona":
          return `[persona]: ${step.role}`;
      }
    })
    .join("\n");

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "system",
          content:
            "You are a prompt engineering assistant. Given a series of prompt building steps, generate a well-formatted, markdown prompt string. Output ONLY the final prompt text, no explanations.",
        },
        {
          role: "user",
          content: `Generate a prompt from these steps:\n\n${stepsDescription}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI request failed: ${response.status} - ${error}`);
  }

  const data = ChatCompletionResponse.parse(await response.json());

  return data.choices[0]?.message.content ?? "";
}
