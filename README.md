# Nudge

A prompt builder with codegen for AI applications.

Define prompts using a fluent builder API, then run a CLI to process and generate them.

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
  p.raw("You are a summarization assistant.")
);
```

### 2. Generate

```bash
npx @nudge/cli
```

This creates `src/prompts.gen.ts` with your processed prompts.

> **Note:** Re-run the CLI after any changes to your prompt files.

### 3. Import and use

Import the generated file once at your app's entry point. After that, `.toString()` works on any prompt throughout your codebase.

```ts
// src/index.ts (entry point)
import "./prompts.gen"; // Import once here

import { summarizerPrompt } from "./summarizer.prompt";

console.log(summarizerPrompt.toString()); // "You are a summarization assistant."
```

## Config (Optional)

Create `nudge.config.json` in your project root to customize behavior:

```json
{
  "generatedFile": "src/prompts.gen.ts",
  "promptFilenamePattern": "**/*.prompt.{ts,js}"
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `generatedFile` | `src/prompts.gen.ts` | Output path for generated file |
| `promptFilenamePattern` | `**/*.prompt.{ts,js}` | Glob pattern for prompt files |

## Builder Methods

```ts
prompt("my-prompt", (p) =>
  p.raw("Raw text content")
);
```

## How It Works

1. **Define** — Write prompts in `*.prompt.ts` files using the builder
2. **Generate** — CLI discovers prompts, processes them, outputs `prompts.gen.ts`
3. **Use** — Import the generated file once at your entry point, then `toString()` returns processed values anywhere

## Packages

| Package | Description |
|---------|-------------|
| `@nudge/core` | Prompt builder and types |
| `@nudge/cli` | Codegen CLI |

## License

MIT
