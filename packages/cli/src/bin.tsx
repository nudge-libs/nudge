#!/usr/bin/env node
import { render } from "ink";
import React from "react";
import {
    EvalCommand,
    GenerateCommand,
    ImproveCommand,
    InitCommand,
} from "./commands/index.js";

const args = process.argv.slice(2);
const command = args[0];

function parseArgs(args: string[]): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];

      if (next && !next.startsWith("--")) {
        result[key] = next;
        i++;
      } else {
        result[key] = true;
      }
    }
  }

  return result;
}

function showHelp() {
  console.log(`
Nudge CLI - Generate type-safe prompt files for AI applications

Usage:
  nudge <command> [options]

Commands:
  init        Initialize a new Nudge configuration
  generate    Generate type-safe prompt files from your prompt templates
  eval        Run tests defined in prompts to evaluate quality
  improve     Iteratively improve prompts based on failing tests

Options:
  generate:
    --force           Skip cache and regenerate all prompts

  eval:
    --verbose         Show detailed test results
    --judge           Use LLM to evaluate string assertions

  improve:
    --max-iterations  Maximum improvement iterations (default: 3)
    --prompt-ids      Comma-separated list of specific prompt IDs to improve
    --verbose         Show detailed improvement steps
    --judge           Use LLM to evaluate string assertions

Examples:
  nudge init
  nudge generate
  nudge generate --force
  nudge eval --verbose
  nudge eval --judge
  nudge improve --max-iterations 5
  nudge improve --prompt-ids summarizer,translator
`);
}

async function main() {
  if (!command || command === "--help" || command === "-h") {
    showHelp();
    return;
  }

  const options = parseArgs(args.slice(1));

  switch (command) {
    case "init":
      render(React.createElement(InitCommand));
      break;

    case "generate":
      render(
        React.createElement(GenerateCommand, {
          force: options.force === true,
        }),
      );
      break;

    case "eval":
      render(
        React.createElement(EvalCommand, {
          verbose: options.verbose === true,
          judge: options.judge === true,
        }),
      );
      break;

    case "improve":
      render(
        React.createElement(ImproveCommand, {
          maxIterations:
            typeof options["max-iterations"] === "string"
              ? parseInt(options["max-iterations"], 10)
              : 3,
          promptIds:
            typeof options["prompt-ids"] === "string"
              ? options["prompt-ids"]
              : undefined,
          verbose: options.verbose === true,
          judge: options.judge === true,
        }),
      );
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.log('Run "nudge --help" for usage information.');
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
