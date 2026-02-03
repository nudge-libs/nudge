import * as fs from "fs";
import { Box, Text, useApp } from "ink";
import * as path from "path";
import { useEffect, useState } from "react";
import type { AIConfig } from "../ai.js";
import { Error as ErrorMessage, Header, Spinner } from "../components/index.js";
import { evaluate as runEvaluate, type VariantEvaluation } from "../index.js";

type NudgeConfig = {
  generatedFile?: string;
  promptFilenamePattern?: string;
  ai?: AIConfig;
};

type EvalCommandProps = {
  verbose?: boolean;
  judge?: boolean;
};

type Status = "loading" | "evaluating" | "done" | "error";

export function EvalCommand({
  verbose = false,
  judge = false,
}: EvalCommandProps) {
  const { exit } = useApp();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [evaluations, setEvaluations] = useState<VariantEvaluation[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
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

      setStatus("evaluating");

      try {
        const results = await runEvaluate(targetDir, outputPath, {
          promptFilenamePattern: config.promptFilenamePattern,
          aiConfig: config.ai,
          verbose,
          judge,
          onVariantStart: (promptId, variantName) => {
            setCurrentPrompt(`${promptId}:${variantName}`);
          },
          onVariantDone: (evaluation) => {
            setEvaluations((prev) => [...prev, evaluation]);
            setCurrentPrompt(null);
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
  }, [verbose, judge, exit]);

  const totalPassed = evaluations.reduce((sum, e) => sum + e.passed, 0);
  const totalFailed = evaluations.reduce((sum, e) => sum + e.failed, 0);
  const totalTests = totalPassed + totalFailed;
  const overallRate =
    totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

  return (
    <Box flexDirection="column" padding={1}>
      <Header
        title="Nudge Eval"
        subtitle="Running tests against your prompts"
      />

      {status === "loading" && <Spinner label="Loading configuration..." />}

      {status === "evaluating" && (
        <Box flexDirection="column" marginTop={1}>
          {evaluations.map((evaluation) => (
            <EvaluationResult
              key={`${evaluation.promptId}-${evaluation.variantName}`}
              evaluation={evaluation}
              verbose={verbose}
            />
          ))}
          {currentPrompt && (
            <Box>
              <Spinner label={`Evaluating ${currentPrompt}...`} />
            </Box>
          )}
        </Box>
      )}

      {status === "done" && (
        <Box flexDirection="column" marginTop={1}>
          {evaluations.map((evaluation) => (
            <EvaluationResult
              key={`${evaluation.promptId}-${evaluation.variantName}`}
              evaluation={evaluation}
              verbose={verbose}
            />
          ))}

          <Box marginTop={1} flexDirection="column">
            <Text bold>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>
            <Box>
              <Text bold>Summary: </Text>
              <Text
                color={
                  overallRate >= 80
                    ? "green"
                    : overallRate >= 50
                      ? "yellow"
                      : "red"
                }
              >
                {totalPassed}/{totalTests} tests passed ({overallRate}%)
              </Text>
            </Box>
          </Box>
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

function EvaluationResult({
  evaluation,
  verbose,
}: {
  evaluation: VariantEvaluation;
  verbose: boolean;
}) {
  const allPassed = evaluation.failed === 0;
  const rateColor =
    evaluation.successRate >= 80
      ? "green"
      : evaluation.successRate >= 50
        ? "yellow"
        : "red";

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color={allPassed ? "green" : "red"}>
          {allPassed ? "✓" : "✗"}{" "}
        </Text>
        <Text bold>{evaluation.promptId}</Text>
        {evaluation.variantName !== "default" && (
          <Text dimColor> ({evaluation.variantName})</Text>
        )}
        <Text> - </Text>
        <Text color={rateColor}>
          {evaluation.passed}/{evaluation.total} passed (
          {Math.round(evaluation.successRate)}%)
        </Text>
      </Box>

      {verbose &&
        evaluation.results.map((result, i) => (
          <Box key={i} marginLeft={2}>
            <Text color={result.passed ? "green" : "red"}>
              {result.passed ? "✓" : "✗"}{" "}
            </Text>
            <Text dimColor>
              "{result.input.slice(0, 40)}
              {result.input.length > 40 ? "..." : ""}"
            </Text>
            {!result.passed && result.reason && (
              <Text color="red"> - {result.reason}</Text>
            )}
          </Box>
        ))}
    </Box>
  );
}
