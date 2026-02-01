# Nudge

A prompt builder with AI-powered codegen for AI applications.

Define prompts using a fluent builder API, then run a CLI to generate optimized system prompts.

```bash
npm install @nudge-ai/core @nudge-ai/cli
```

## Quick Start

### 1. Initialize

Run the init command to set up your configuration:

```bash
npx @nudge-ai/cli init
```

This will guide you through choosing a provider (OpenAI, OpenRouter, or local) and create a `nudge.config.json` file.

### 2. Create a prompt

Prompts must be defined in files matching `*.prompt.ts` (or `.js`). This naming convention is required for the CLI to discover them.

```ts
// src/summarizer.prompt.ts
import { prompt } from "@nudge-ai/core";

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

### 3. Generate

```bash
npx @nudge-ai/cli generate
```

This creates `src/prompts.gen.ts` with your AI-generated system prompts.

Use `--no-cache` to regenerate all prompts, ignoring the hash cache:

```bash
npx @nudge-ai/cli generate --no-cache
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
| `.variant(name, builderFn)` | Define a named variant with additional steps for A/B testing |

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

## Variables

Use `{{variable}}` placeholders in any builder string to create dynamic prompts. Variables are automatically extracted from the generated prompt and fully typed:

```ts
const greeter = prompt("greeter", (p) =>
  p
    .persona("friendly assistant helping {{name}}")
    .context("the user wants to learn about {{topic}}")
    .do("address the user by name")
    .do("focus discussion on their chosen topic")
);

// Variables are required and typed:
greeter.toString({ name: "Alice", topic: "TypeScript" });

// TypeScript errors:
greeter.toString({ name: "Alice" });           // Error: missing 'topic'
greeter.toString({ name: "Alice", typo: "x" }); // Error: 'typo' doesn't exist
```

Variables can be combined with optionals:

```ts
const assistant = prompt("assistant", (p) =>
  p
    .persona("assistant for {{company}}")
    .optional("formal", (p) => p.do("use formal language"))
);

assistant.toString({ company: "Acme Inc" });                    // Base prompt
assistant.toString({ company: "Acme Inc", formal: true });      // With formal option
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

## Variants (A/B Testing)

Define multiple variants of a prompt for A/B testing. Each variant adds additional steps to the base prompt, giving you explicit control over what differs between variants.

```ts
const summarizer = prompt("summarizer", (p) =>
  p
    .persona("expert summarizer")
    .input("text to summarize")
    .output("concise summary")
    // Define variants - each adds steps to the base prompt
    .variant("short", (v) =>
      v.constraint("keep the summary to 1-2 sentences maximum")
    )
    .variant("detailed", (v) =>
      v
        .do("explain the context and background")
        .do("include specific examples where relevant")
    )
);
```

**How it works:**
- Base prompt: persona + input + output
- Variant "short": base + constraint (1-2 sentences)
- Variant "detailed": base + do (context) + do (examples)

Each variant generates a separate prompt via the AI, ensuring meaningful differences.

### Using variants at runtime

```ts
// Variant names are typed!
summarizer.toString({ variant: "short" });
summarizer.toString({ variant: "detailed" });

// List available variants
console.log(summarizer.variantNames); // ["short", "detailed"]

// A/B test with random selection
const variants = summarizer.variantNames;
const randomVariant = variants[Math.floor(Math.random() * variants.length)];
summarizer.toString({ variant: randomVariant });
```

## Custom Steps

Create custom step types for domain-specific needs using `createStep` and `createBuilder`:

```ts
import { createStep, createBuilder } from "@nudge-ai/core";

// Define a custom step
const tone = createStep({
  name: "tone",
  build: (style: string) => ({ type: "tone" as const, style }),
  format: (step) => `[Tone] Write in a ${step.style} tone.`,
});

// Create a builder with your custom step (base steps are included automatically)
const builder = createBuilder([tone]);

// Use your custom step alongside built-in steps
export const myPrompt = builder.prompt("my-prompt", (p) =>
  p
    .persona("helpful assistant")
    .tone("friendly and casual") // Your custom step!
    .do("be concise")
);
```

To create a builder with **only** your custom steps (no base steps):

```ts
const minimalBuilder = createBuilder([tone], { omitBaseSteps: true });
```

## CLI Options

| Option | Default | Description |
|--------|---------|-------------|
| `--no-cache` | — | Regenerate all prompts, ignoring the hash cache |

## Config Options

Configuration in `nudge.config.json`:

| Option | Default | Description |
|--------|---------|-------------|
| `generatedFile` | `src/prompts.gen.ts` | Output path for generated file |
| `promptFilenamePattern` | `**/*.prompt.{ts,js}` | Glob pattern for prompt files |
| `ai.provider` | — | `"openai"`, `"openrouter"`, or `"local"` |
| `ai.apiKeyEnvVar` | — | Environment variable name for API key (optional for `"local"`) |
| `ai.model` | — | Model identifier |
| `ai.baseUrl` | — | Custom API base URL (required for `"local"`, optional override for others) |

## How It Works

1. **Define** — Write prompts in `*.prompt.ts` files using the builder
2. **Generate** — CLI discovers prompts, sends them to an AI to synthesize into well-crafted system prompts
3. **Cache** — Prompts are hashed; unchanged prompts skip AI processing on subsequent runs
4. **Use** — Import the generated file once, then `toString()` returns the generated prompt anywhere

## Packages

| Package | Description |
|---------|-------------|
| `@nudge-ai/core` | Prompt builder and types |
| `@nudge-ai/cli` | Codegen CLI |

## API Reference

### Core Exports

```ts
import { prompt, createBuilder, createStep } from "@nudge-ai/core";
import type { Prompt, Builder, StepDefinition } from "@nudge-ai/core";
```

| Export | Description |
|--------|-------------|
| `prompt` | Create a prompt using the default builder with all base steps |
| `createBuilder` | Create a custom builder, optionally with additional steps |
| `createStep` | Define a custom step type |
| `Prompt` | Type for prompt instances |
| `Builder` | Type for builder instances |
| `StepDefinition` | Type for step definitions |
