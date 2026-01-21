#!/usr/bin/env bun
import * as fs from "fs";
import * as path from "path";
import { generate } from "./index.js";

type NudgeConfig = {
  generatedFile?: string;
  promptFilenamePattern?: string;
};

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
}).catch((error) => {
  console.error("Error generating prompts:", error);
  process.exit(1);
});
