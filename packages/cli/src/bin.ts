#!/usr/bin/env node
import { program } from "@caporal/core";
import { input, select } from "@inquirer/prompts";
import * as fs from "fs";
import * as path from "path";
import { AIConfig } from "./ai.js";
import { evaluate, generate, improve } from "./index.js";

type NudgeConfig = {
  generatedFile?: string;
  promptFilenamePattern?: string;
  ai?: AIConfig;
};

program
  .bin("nudge")
  .description(
    "CLI for Nudge - generate type-safe prompt files for AI applications",
  )
  .command("init", "Initialize a new Nudge configuration")
  .action(async () => {
    const cwd = process.cwd();
    const configPath = path.join(cwd, "nudge.config.json");

    if (fs.existsSync(configPath)) {
      console.log("⚠️  nudge.config.json already exists!");
      const overwrite = await select({
        message: "Do you want to overwrite it?",
        choices: [
          { name: "No", value: false },
          { name: "Yes", value: true },
        ],
      });

      if (!overwrite) {
        console.log("Initialization cancelled.");
        return;
      }
    }

    console.log("🚀 Let's set up your Nudge configuration!\n");

    const provider = await select({
      message: "Choose your AI provider:",
      choices: [
        { name: "OpenAI", value: "openai" },
        { name: "OpenRouter", value: "openrouter" },
        { name: "Local (custom endpoint)", value: "local" },
      ],
    });

    const apiKeyEnvVar = await input({
      message: "API key environment variable name:",
      default:
        provider === "openai"
          ? "OPENAI_API_KEY"
          : provider === "openrouter"
            ? "OPENROUTER_API_KEY"
            : "API_KEY",
    });

    let baseUrl: string | undefined;
    if (provider === "local") {
      baseUrl = await input({
        message: "Base URL for your local provider:",
        default: "http://localhost:11434/v1",
      });
    }

    const model = await input({
      message: "Model name:",
      default:
        provider === "openai"
          ? "gpt-4o"
          : provider === "openrouter"
            ? "anthropic/claude-3.5-sonnet"
            : "llama2",
    });

    const config: NudgeConfig = {
      ai: {
        provider: provider as AIConfig["provider"],
        apiKeyEnvVar,
        model,
        ...(baseUrl && { baseUrl }),
      },
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");

    console.log("\n✅ Configuration saved to nudge.config.json");
    console.log(
      `\n💡 Next steps:\n   1. Set your ${apiKeyEnvVar} environment variable\n   2. Create your prompt files (e.g., src/prompts/example.prompt.ts)\n   3. Run 'npx @nudge-ai/cli generate' to compile your prompts\n   4. Import './prompts.gen' once at your app's entry point`,
    );
  })
  .command(
    "generate",
    "Generate type-safe prompt files from your prompt templates",
  )
  .option("--force", "Skip cache and regenerate all prompts", {
    default: false,
  })
  .action(async ({ options }) => {
    const noCache = options.force as boolean;
    const cwd = process.cwd();
    const configPath = path.join(cwd, "nudge.config.json");

    let config: NudgeConfig = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }

    const outputPath = config.generatedFile
      ? path.join(cwd, config.generatedFile)
      : path.join(cwd, "src", "prompts.gen.ts");

    const targetDir = path.dirname(outputPath);

    try {
      await generate(targetDir, outputPath, {
        promptFilenamePattern: config.promptFilenamePattern,
        aiConfig: config.ai,
        noCache,
      });
    } catch (error) {
      console.error("Error generating prompts:", error);
      process.exit(1);
    }
  })
  .command("eval", "Run tests defined in prompts to evaluate quality")
  .option("--verbose", "Show detailed test results", {
    default: false,
  })
  .option("--judge", "Use LLM to evaluate string assertions", {
    default: false,
  })
  .action(async ({ options }) => {
    const verbose = options.verbose as boolean;
    const judge = options.judge as boolean;
    const cwd = process.cwd();
    const configPath = path.join(cwd, "nudge.config.json");

    let config: NudgeConfig = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }

    const outputPath = config.generatedFile
      ? path.join(cwd, config.generatedFile)
      : path.join(cwd, "src", "prompts.gen.ts");

    const targetDir = path.dirname(outputPath);

    try {
      await evaluate(targetDir, outputPath, {
        promptFilenamePattern: config.promptFilenamePattern,
        aiConfig: config.ai,
        verbose,
        judge,
      });
    } catch (error) {
      console.error("Error evaluating prompts:", error);
      process.exit(1);
    }
  })
  .command("improve", "Iteratively improve prompts based on failing tests")
  .option("--max-iterations <n>", "Maximum improvement iterations", {
    default: "3",
  })
  .option("--prompt-ids <ids>", "Comma-separated list of specific prompt IDs to improve")
  .option("--verbose", "Show detailed improvement steps", {
    default: false,
  })
  .option("--judge", "Use LLM to evaluate string assertions", {
    default: false,
  })
  .action(async ({ options }) => {
    const maxIterations = parseInt(options.maxIterations as string, 10);
    const promptIdsStr = options.promptIds as string | undefined;
    const promptIds = promptIdsStr
      ? promptIdsStr.split(",").map((id) => id.trim())
      : undefined;
    const verbose = options.verbose as boolean;
    const judge = options.judge as boolean;
    const cwd = process.cwd();
    const configPath = path.join(cwd, "nudge.config.json");

    let config: NudgeConfig = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }

    if (!config.ai) {
      console.error("Error: AI config is required in nudge.config.json");
      process.exit(1);
    }

    const outputPath = config.generatedFile
      ? path.join(cwd, config.generatedFile)
      : path.join(cwd, "src", "prompts.gen.ts");

    const targetDir = path.dirname(outputPath);

    try {
      await improve(targetDir, outputPath, {
        maxIterations,
        promptIds,
        verbose,
        judge,
        aiConfig: config.ai,
        promptFilenamePattern: config.promptFilenamePattern,
      });
    } catch (error) {
      console.error("Error improving prompts:", error);
      process.exit(1);
    }
  });

program.run();
