import * as fs from "fs";
import { Box, Text, useApp } from "ink";
import * as path from "path";
import { useEffect, useState } from "react";
import type { AIConfig } from "../ai.js";
import { Error as ErrorMessage, Header, Spinner, Success } from "../components/index.js";
import { generate as runGenerate } from "../index.js";

type NudgeConfig = {
  generatedFile?: string;
  promptFilenamePattern?: string;
  ai?: AIConfig;
};

type GenerateCommandProps = {
  force?: boolean;
};

type Status = "loading" | "generating" | "done" | "error";

type PromptStatus = {
  id: string;
  status: "pending" | "generating" | "cached" | "done" | "error";
  variantCount?: number;
};

export function GenerateCommand({ force = false }: GenerateCommandProps) {
  const { exit } = useApp();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<PromptStatus[]>([]);
  const [outputPath, setOutputPath] = useState<string>("");

  useEffect(() => {
    async function run() {
      const cwd = process.cwd();
      const configPath = path.join(cwd, "nudge.config.json");

      let config: NudgeConfig = {};
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      }

      const output = config.generatedFile
        ? path.join(cwd, config.generatedFile)
        : path.join(cwd, "src", "prompts.gen.ts");

      setOutputPath(output);
      const targetDir = path.dirname(output);

      setStatus("generating");

      try {
        await runGenerate(targetDir, output, {
          promptFilenamePattern: config.promptFilenamePattern,
          aiConfig: config.ai,
          noCache: force,
          onPromptStart: (id, variantCount) => {
            setPrompts((prev) => [
              ...prev,
              { id, status: "generating", variantCount },
            ]);
          },
          onPromptCached: (id) => {
            setPrompts((prev) => [
              ...prev,
              { id, status: "cached" },
            ]);
          },
          onPromptDone: (id, variantCount) => {
            setPrompts((prev) =>
              prev.map((p) =>
                p.id === id ? { ...p, status: "done", variantCount } : p
              )
            );
          },
          onPromptError: (id, err) => {
            setPrompts((prev) =>
              prev.map((p) =>
                p.id === id ? { ...p, status: "error" } : p
              )
            );
          },
        });

        setStatus("done");
        setTimeout(() => exit(), 100);
      } catch (err) {
        setError(String(err));
        setStatus("error");
        setTimeout(() => exit(), 100);
      }
    }

    run();
  }, [force, exit]);

  return (
    <Box flexDirection="column" padding={1}>
      <Header title="Nudge Generate" subtitle="Generating type-safe prompt files" />

      {status === "loading" && <Spinner label="Loading configuration..." />}

      {(status === "generating" || status === "done") && (
        <Box flexDirection="column" marginTop={1}>
          {prompts.map((prompt) => (
            <Box key={prompt.id}>
              {prompt.status === "generating" && (
                <Box>
                  <Text color="cyan">◐ </Text>
                  <Text>"{prompt.id}" generating{prompt.variantCount && prompt.variantCount > 1 ? ` ${prompt.variantCount} variant(s)` : ""}...</Text>
                </Box>
              )}
              {prompt.status === "cached" && (
                <Box>
                  <Text color="gray">✓ </Text>
                  <Text dimColor>"{prompt.id}" (cached)</Text>
                </Box>
              )}
              {prompt.status === "done" && (
                <Box>
                  <Text color="green">✓ </Text>
                  <Text>"{prompt.id}" generated{prompt.variantCount && prompt.variantCount > 1 ? ` ${prompt.variantCount} variant(s)` : ""}</Text>
                </Box>
              )}
              {prompt.status === "error" && (
                <Box>
                  <Text color="red">✗ </Text>
                  <Text>"{prompt.id}" failed</Text>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}

      {status === "done" && (
        <Box marginTop={1}>
          <Success>Generated {outputPath} with {prompts.length} prompt(s)</Success>
        </Box>
      )}

      {status === "error" && (
        <Box marginTop={1}>
          <ErrorMessage>{error}</ErrorMessage>
        </Box>
      )}
    </Box>
  );
}
