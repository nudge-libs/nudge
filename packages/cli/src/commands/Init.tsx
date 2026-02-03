import * as fs from "fs";
import { Box, Text, useApp } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import * as path from "path";
import { useEffect, useState } from "react";
import type { AIConfig } from "../ai.js";
import { Header, Success, Warning } from "../components/index.js";

type NudgeConfig = {
  generatedFile?: string;
  promptFilenamePattern?: string;
  ai?: AIConfig;
};

type Step =
  | "check-existing"
  | "confirm-overwrite"
  | "select-provider"
  | "enter-api-key-env"
  | "enter-base-url"
  | "enter-model"
  | "done";

const PROVIDER_CHOICES = [
  { label: "OpenAI", value: "openai" as const },
  { label: "OpenRouter", value: "openrouter" as const },
  { label: "Local (custom endpoint)", value: "local" as const },
];

const DEFAULT_API_KEYS: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  local: "API_KEY",
};

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o",
  openrouter: "anthropic/claude-3.5-sonnet",
  local: "llama2",
};

export function InitCommand() {
  const { exit } = useApp();
  const cwd = process.cwd();
  const configPath = path.join(cwd, "nudge.config.json");

  const [step, setStep] = useState<Step>("check-existing");
  const [provider, setProvider] = useState<AIConfig["provider"]>("openai");
  const [apiKeyEnvVar, setApiKeyEnvVar] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [configExists, setConfigExists] = useState(false);

  // Check if config exists on mount
  useEffect(() => {
    const exists = fs.existsSync(configPath);
    setConfigExists(exists);
    if (exists) {
      setStep("confirm-overwrite");
    } else {
      setStep("select-provider");
    }
  }, [configPath]);

  // Handle completion
  useEffect(() => {
    if (step === "done") {
      const config: NudgeConfig = {
        ai: {
          provider,
          apiKeyEnvVar,
          model,
          ...(baseUrl && { baseUrl }),
        },
      };

      try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
      } catch (err) {
        setError(`Failed to write config: ${err}`);
        return;
      }

      setTimeout(() => exit(), 100);
    }
  }, [step, provider, apiKeyEnvVar, model, baseUrl, configPath, exit]);

  const handleProviderSelect = (item: { value: AIConfig["provider"] }) => {
    setProvider(item.value);
    setApiKeyEnvVar(DEFAULT_API_KEYS[item.value]);
    setModel(DEFAULT_MODELS[item.value]);
    setStep("enter-api-key-env");
  };

  const handleApiKeySubmit = () => {
    if (provider === "local") {
      setBaseUrl("http://localhost:11434/v1");
      setStep("enter-base-url");
    } else {
      setStep("enter-model");
    }
  };

  const handleBaseUrlSubmit = () => {
    setStep("enter-model");
  };

  const handleModelSubmit = () => {
    setStep("done");
  };

  const handleOverwriteSelect = (item: { value: boolean }) => {
    if (item.value) {
      setStep("select-provider");
    } else {
      exit();
    }
  };

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Header title="Nudge Init" subtitle="Let's set up your configuration!" />

      {step === "confirm-overwrite" && (
        <Box flexDirection="column">
          <Warning>nudge.config.json already exists!</Warning>
          <Box marginTop={1}>
            <Text>Do you want to overwrite it?</Text>
          </Box>
          <Box marginTop={1}>
            <SelectInput
              items={[
                { label: "No", value: false },
                { label: "Yes", value: true },
              ]}
              onSelect={handleOverwriteSelect}
            />
          </Box>
        </Box>
      )}

      {step === "select-provider" && (
        <Box flexDirection="column">
          <Text>Choose your AI provider:</Text>
          <Box marginTop={1}>
            <SelectInput
              items={PROVIDER_CHOICES}
              onSelect={handleProviderSelect}
            />
          </Box>
        </Box>
      )}

      {step === "enter-api-key-env" && (
        <Box flexDirection="column">
          <Text>API key environment variable name:</Text>
          <Box marginTop={1}>
            <Text color="cyan">❯ </Text>
            <TextInput
              value={apiKeyEnvVar}
              onChange={setApiKeyEnvVar}
              onSubmit={handleApiKeySubmit}
            />
          </Box>
        </Box>
      )}

      {step === "enter-base-url" && (
        <Box flexDirection="column">
          <Text>Base URL for your local provider:</Text>
          <Box marginTop={1}>
            <Text color="cyan">❯ </Text>
            <TextInput
              value={baseUrl}
              onChange={setBaseUrl}
              onSubmit={handleBaseUrlSubmit}
            />
          </Box>
        </Box>
      )}

      {step === "enter-model" && (
        <Box flexDirection="column">
          <Text>Model name:</Text>
          <Box marginTop={1}>
            <Text color="cyan">❯ </Text>
            <TextInput
              value={model}
              onChange={setModel}
              onSubmit={handleModelSubmit}
            />
          </Box>
        </Box>
      )}

      {step === "done" && (
        <Box flexDirection="column" marginTop={1}>
          <Success>Configuration saved to nudge.config.json</Success>
          <Box marginTop={1} flexDirection="column">
            <Text color="yellow">💡 Next steps:</Text>
            <Text> 1. Set your {apiKeyEnvVar} environment variable</Text>
            <Text>
              {" "}
              2. Create your prompt files (e.g., src/prompts/example.prompt.ts)
            </Text>
            <Text>
              {" "}
              3. Run 'npx @nudge-ai/cli generate' to compile your prompts
            </Text>
            <Text>
              {" "}
              4. Import './prompts.gen' once at your app's entry point
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
