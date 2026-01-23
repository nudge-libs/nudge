# Nudge

A prompt builder with AI-powered codegen for AI applications.

Define prompts using a fluent builder API, then run a CLI to generate optimized system prompts.

```bash
npm install @nudge/core @nudge/cli
```

## Quick Start

### 1. Create a prompt

Prompts must be defined in files matching `*.prompt.ts` (or `.js`). This naming convention is required for the CLI to discover them.

```ts
// src/summarizer.prompt.ts
import { prompt } from "@nudge/core";

export const summarizerPrompt = prompt("summarizer", (p) =>
  p
    .persona("expert summarizer")
    .context("Users will paste articles, documents, or notes they want condensed")
    .input("a block of text to summarize")
    .output("a concise summary")
    .do("preserve key facts and figures", { nudge: 1 })
    .do("use clear, simple language")
    .dont("add opinions or interpretations", { nudge: 3 })
    .constraint("keep under 3 paragraphs")
    .example("The quick brown fox...", "A fox jumps over a dog.")
);
```

### 2. Configure AI

Create `nudge.config.json` in your project root:

```json
{
  "ai": {
    "provider": "openrouter",
    "apiKeyEnvVar": "OPENROUTER_API_KEY",
    "model": "anthropic/claude-sonnet-4"
  }
}
```

### 3. Generate

```bash
npx @nudge/cli
```

This creates `src/prompts.gen.ts` with your AI-generated system prompts.

Use `--no-cache` to regenerate all prompts, ignoring the hash cache:

```bash
npx @nudge/cli --no-cache
```

> **Note:** Re-run the CLI after any changes to your prompt files.

### 4. Import and use

Import the generated file once at your app's entry point. After that, `.toString()` works on any prompt throughout your codebase.

```ts
// src/index.ts (entry point)
import "./prompts.gen"; // Import once here

import { summarizerPrompt } from "./summarizer.prompt";

console.log(summarizerPrompt.toString()); // Returns the AI-generated system prompt
```

## Builder Methods

| Method | Description |
|--------|-------------|
| `.raw(text)` | Include raw text verbatim in the prompt |
| `.persona(role)` | Define the AI's identity and role |
| `.context(information)` | Provide background information or situational context |
| `.input(description)` | Describe what input the AI will receive |
| `.output(description)` | Specify what the AI should produce |
| `.do(instruction, options?)` | A positive instruction to follow |
| `.dont(instruction, options?)` | Something the AI must avoid |
| `.constraint(rule, options?)` | A hard rule or limitation |
| `.example(input, output)` | An input/output example to demonstrate behavior |
| `.use(prompt)` | Include all steps from another prompt |
| `.optional(name, builderFn)` | Define a conditional block that can be toggled at runtime |

All methods are chainable:

```ts
prompt("my-prompt", (p) =>
  p
    .persona("helpful assistant")
    .context("This assistant helps users with technical questions")
    .do("be concise")
    .dont("use jargon")
);
```

## Reusing Prompts

Use `.use()` to include steps from another prompt, making it easy to share common rules:

```ts
// Define reusable rules
const jsonRules = prompt("json-rules", (p) =>
  p
    .output("valid JSON")
    .constraint("output must be parseable JSON", { nudge: 5 })
);

// Reuse in other prompts
const summarizer = prompt("summarizer", (p) =>
  p
    .persona("expert summarizer")
    .input("text to summarize")
    .use(jsonRules) // includes output and constraint from jsonRules
    .do("preserve key facts")
);
```

## Optional Blocks

Use `.optional()` to define conditional sections that can be toggled at runtime:

```ts
const summarizer = prompt("summarizer", (p) =>
  p
    .persona("expert summarizer")
    .input("text to summarize")
    .output("concise summary")
    .optional("json", (p) =>
      p
        .output("valid JSON object")
        .constraint("must be parseable JSON")
    )
);

// At runtime, toggle optional blocks via toString():
summarizer.toString();               // Base prompt only
summarizer.toString({ json: true }); // Includes JSON instructions
```

Optional names are fully typed—TypeScript will autocomplete available options and error on invalid ones.

Optionals can be nested:

```ts
.optional("format", (p) =>
  p
    .output("structured output")
    .optional("json", (p) => p.constraint("use JSON format"))
    .optional("xml", (p) => p.constraint("use XML format"))
)

// All options are available at the top level:
prompt.toString({ format: true, json: true });
```

## Nudge Levels

The `.do()`, `.dont()`, and `.constraint()` methods accept an optional `{ nudge }` option to control instruction strength. Nudge is a number from 1-5:

| Level | Strength | Example Language |
|-------|----------|------------------|
| `1` | Optional | "feel free to", "if you'd like" |
| `2` | Suggestion | "consider", "when possible" |
| `3` | Standard (default) | "keep", "avoid", "make sure" |
| `4` | Strong | "always", "never", "it's important" |
| `5` | Required | "you must", "under no circumstances" |

```ts
prompt("strict-assistant", (p) =>
  p
    .do("be helpful")
    .do("preserve accuracy", { nudge: 4 })
    .dont("make up information", { nudge: 5 })
    .constraint("respond in English", { nudge: 2 })
);
```

## Config Options

| Option | Default | Description |
|--------|---------|-------------|
| `generatedFile` | `src/prompts.gen.ts` | Output path for generated file |
| `promptFilenamePattern` | `**/*.prompt.{ts,js}` | Glob pattern for prompt files |
| `ai.provider` | — | `"openai"` or `"openrouter"` |
| `ai.apiKeyEnvVar` | — | Environment variable name for API key |
| `ai.model` | — | Model identifier |

## How It Works

1. **Define** — Write prompts in `*.prompt.ts` files using the builder
2. **Generate** — CLI discovers prompts, sends them to an AI to synthesize into well-crafted system prompts
3. **Cache** — Prompts are hashed; unchanged prompts skip AI processing on subsequent runs
4. **Use** — Import the generated file once, then `toString()` returns the generated prompt anywhere

## Packages

| Package | Description |
|---------|-------------|
| `@nudge/core` | Prompt builder and types |
| `@nudge/cli` | Codegen CLI |