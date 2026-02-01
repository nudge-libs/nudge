import { formatStepForAI, type BaseStep } from "@nudge-ai/core/internal";
import * as z from "zod/mini";

export type AIConfig = {
  provider: "openai" | "openrouter" | "local";
  apiKeyEnvVar?: string;
  model: string;
  baseUrl?: string;
};

const PROVIDER_BASE_URLS: Record<"openai" | "openrouter", string> = {
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

const SYSTEM_PROMPT = `You are an expert prompt engineer. Your task is to generate a well-crafted system prompt for an AI assistant.

You will receive a series of building blocks that describe what the system prompt should contain. Each block has a type, instructions, and a value. Some blocks may have a "Nudge" level (1-5) indicating how strongly to convey the instruction.

Your job is to synthesize these blocks into a single, coherent system prompt that:
- Flows naturally as prose instructions to an AI
- Preserves any {{variable}} placeholders EXACTLY as written (e.g., {{name}}, {{topic}}) - these are runtime variables that will be substituted later
- Weaves all elements together seamlessly - DO NOT create sections labeled after the block types (no "Do:", "Don't:", "Constraints:" sections)
- Integrates positive instructions, prohibitions, and constraints into natural sentences
- Uses clear, direct language addressing the AI as "you"
- Is formatted in markdown for readability

## Nudge Levels (1-5)

When a block has a nudge level, adjust the language strength accordingly:

**1**: Barely there, optional. Use very soft language like "you might consider", "feel free to", "optionally", "if you'd like".
Example: "Feel free to keep responses concise if you'd like."

**2**: Gentle suggestion. Use soft language like "try to", "consider", "when possible", "ideally".
Example: "Consider keeping responses concise when possible."

**3** (default when not specified): Standard instruction. Use direct but neutral language like "keep", "use", "avoid", "make sure".
Example: "Keep your responses concise and focused."

**4**: Strong instruction. Use emphatic language like "always", "never", "be sure to", "it's important that", "remember to".
Example: "Always keep your responses concise. It's important that you stay focused."

**5**: Absolute requirement, non-negotiable. Use forceful language like "you must", "under no circumstances", "this is essential", "absolutely never", "without exception".
Example: "You must keep responses concise. Under no circumstances should you provide lengthy explanations."

Bad example (don't do this):
"## Do
- Keep responses brief
## Don't
- Use jargon"

Good example (do this instead):
"Keep your responses brief and accessible. Avoid technical jargon that might confuse users."

Output ONLY the final system prompt text. Do not include any explanations, preamble, or meta-commentary.`;

export async function processPrompt(
  steps: BaseStep[],
  config: AIConfig,
): Promise<string> {
  let baseUrl: string;
  if (config.baseUrl) {
    if (
      !config.baseUrl.startsWith("http://") &&
      !config.baseUrl.startsWith("https://")
    ) {
      throw new Error(
        `Invalid baseUrl "${config.baseUrl}": must start with http:// or https://`,
      );
    }
    baseUrl = config.baseUrl;
  } else if (config.provider === "local") {
    throw new Error(
      'Local provider requires "baseUrl" in config (e.g., "http://localhost:8080/v1")',
    );
  } else {
    baseUrl = PROVIDER_BASE_URLS[config.provider];
  }

  // API key is optional for local provider
  let apiKey: string | undefined;
  if (config.apiKeyEnvVar) {
    apiKey = process.env[config.apiKeyEnvVar];
    if (!apiKey) {
      throw new Error(
        `Missing API key: environment variable "${config.apiKeyEnvVar}" is not set`,
      );
    }
  } else if (config.provider !== "local") {
    throw new Error(
      `Missing "apiKeyEnvVar" in config for provider "${config.provider}"`,
    );
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const stepsDescription = steps.map(formatStepForAI).join("\n\n");

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Generate a system prompt from these building blocks:\n\n${stepsDescription}`,
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
