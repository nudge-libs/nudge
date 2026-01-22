#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import { AIConfig } from "./ai.js";
import { generate } from "./index.js";

type NudgeConfig = {
  generatedFile?: string;
  promptFilenamePattern?: string;
  ai?: AIConfig;
};

const args = process.argv.slice(2);
const noCache = args.includes("--no-cache");

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

generate(targetDir, outputPath, {
  promptFilenamePattern: config.promptFilenamePattern,
  aiConfig: config.ai,
  noCache,
}).catch((error) => {
  console.error("Error generating prompts:", error);
  process.exit(1);
});
