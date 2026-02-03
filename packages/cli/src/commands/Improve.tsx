import * as fs from "fs";
import { Box, Text, useApp } from "ink";
import * as path from "path";
import { useEffect, useState } from "react";
import type { AIConfig } from "../ai.js";
import {
    Error as ErrorMessage,
    Header,
    Spinner,
    Success,
    Warning,
} from "../components/index.js";
import { improve as runImprove, type ImprovementResult } from "../index.js";

type NudgeConfig = {
  generatedFile?: string;
  promptFilenamePattern?: string;
  ai?: AIConfig;
};

type ImproveCommandProps = {
  maxIterations?: number;
  promptIds?: string;
  verbose?: boolean;
  judge?: boolean;
};

type Status = "loading" | "improving" | "done" | "error";

type SourceHint = {
  stepType: string;
  action: string;
  suggestion: string;
  reason: string;
};

type ImprovementProgress = {
  promptId: string;
  variantName: string;
  iteration: number;
  maxIterations: number;
  status: "improving" | "improved" | "plateau" | "max_iterations";
  currentStatus?: string;
  initialFailures?: number;
  finalFailures?: number;
  sourceHints?: SourceHint[];
};

export function ImproveCommand({
  maxIterations = 3,
  promptIds,
  verbose = false,
  judge = false,
}: ImproveCommandProps) {
  const { exit } = useApp();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ImprovementProgress[]>([]);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [results, setResults] = useState<ImprovementResult[]>([]);

  useEffect(() => {
    async function run() {
      const cwd = process.cwd();
      const configPath = path.join(cwd, "nudge.config.json");

      let config: NudgeConfig = {};
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      }

      if (!config.ai) {
        setError("AI config is required in nudge.config.json");
        setStatus("error");
        setTimeout(() => exit(), 100);
        return;
      }

      const outputPath = config.generatedFile
        ? path.join(cwd, config.generatedFile)
        : path.join(cwd, "src", "prompts.gen.ts");

      const targetDir = path.dirname(outputPath);

      setStatus("improving");

      try {
        const promptIdList = promptIds
          ? promptIds.split(",").map((id) => id.trim())
          : undefined;

        const improvementResults = await runImprove(targetDir, outputPath, {
          maxIterations,
          promptIds: promptIdList,
          verbose,
          judge,
          aiConfig: config.ai,
          promptFilenamePattern: config.promptFilenamePattern,
          onStatus: (promptId, variantName, statusMessage) => {
            setProgress((prev) => {
              const existing = prev.find(
                (p) => p.promptId === promptId && p.variantName === variantName,
              );
              if (existing) {
                return prev.map((p) =>
                  p.promptId === promptId && p.variantName === variantName
                    ? { ...p, currentStatus: statusMessage }
                    : p,
                );
              }
              return [
                ...prev,
                {
                  promptId,
                  variantName,
                  iteration: 0,
                  maxIterations,
                  status: "improving",
                  currentStatus: statusMessage,
                },
              ];
            });
          },
          onIterationStart: (promptId, variantName, iteration) => {
            setProgress((prev) => {
              const existing = prev.find(
                (p) => p.promptId === promptId && p.variantName === variantName,
              );
              if (existing) {
                return prev.map((p) =>
                  p.promptId === promptId && p.variantName === variantName
                    ? { ...p, iteration, status: "improving" }
                    : p,
                );
              }
              return [
                ...prev,
                {
                  promptId,
                  variantName,
                  iteration,
                  maxIterations,
                  status: "improving",
                },
              ];
            });
            setCurrentAction(
              `Improving ${promptId}:${variantName} (iteration ${iteration}/${maxIterations})`,
            );
          },
          onIterationDone: (promptId, variantName, result) => {
            setProgress((prev) =>
              prev.map((p) =>
                p.promptId === promptId && p.variantName === variantName
                  ? {
                      ...p,
                      status: result.status,
                      initialFailures: result.initialFailures,
                      finalFailures: result.finalFailures,
                      sourceHints: result.sourceHints,
                    }
                  : p,
              ),
            );
            setCurrentAction(null);
          },
        });

        setResults(improvementResults);
        setStatus("done");
        setTimeout(() => exit(), 100);
      } catch (err) {
        setError(String(err));
        setStatus("error");
        setTimeout(() => exit(), 100);
      }
    }

    run();
  }, [maxIterations, promptIds, verbose, judge, exit]);

  const improved = results.filter((r) => r.status === "improved").length;
  const plateau = results.filter((r) => r.status === "plateau").length;
  const maxedOut = results.filter((r) => r.status === "max_iterations").length;

  return (
    <Box flexDirection="column" padding={1}>
      <Header
        title="Nudge Improve"
        subtitle="Iteratively improving prompts based on failing tests"
      />

      {status === "loading" && <Spinner label="Loading configuration..." />}

      {(status === "improving" || status === "done") && (
        <Box flexDirection="column" marginTop={1}>
          {progress.map((p) => (
            <Box key={`${p.promptId}-${p.variantName}`} marginBottom={1}>
              <ImprovementStatus progress={p} />
            </Box>
          ))}

          {currentAction && (
            <Box marginTop={1}>
              <Spinner label={currentAction} />
            </Box>
          )}
        </Box>
      )}

      {status === "done" && results.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>
          <Box flexDirection="column">
            <Text bold>Summary:</Text>
            {improved > 0 && <Success>{improved} prompt(s) improved</Success>}
            {plateau > 0 && (
              <Warning>
                {plateau} prompt(s) reached plateau (no more improvements
                possible)
              </Warning>
            )}
            {maxedOut > 0 && (
              <Warning>{maxedOut} prompt(s) hit max iterations</Warning>
            )}
          </Box>
        </Box>
      )}

      {status === "done" && results.length === 0 && (
        <Box marginTop={1}>
          <Success>All prompts are passing their tests!</Success>
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

function ImprovementStatus({ progress }: { progress: ImprovementProgress }) {
  const icon =
    progress.status === "improved"
      ? "✓"
      : progress.status === "improving"
        ? "◐"
        : progress.status === "plateau"
          ? "○"
          : "⚠";

  const color =
    progress.status === "improved"
      ? "green"
      : progress.status === "improving"
        ? "cyan"
        : "yellow";

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={color}>{icon} </Text>
        <Text bold>{progress.promptId}</Text>
        {progress.variantName !== "default" && (
          <Text dimColor> ({progress.variantName})</Text>
        )}
        {progress.status === "improving" && progress.iteration > 0 && (
          <Text dimColor>
            {" "}
            - iteration {progress.iteration}/{progress.maxIterations}
          </Text>
        )}
        {progress.status === "improving" && progress.currentStatus && (
          <Text dimColor> - {progress.currentStatus}</Text>
        )}
        {progress.status === "improved" && (
          <Text color="green">
            {" "}
            - improved ({progress.initialFailures} → {progress.finalFailures}{" "}
            failures)
          </Text>
        )}
        {progress.status === "plateau" && (
          <Text color="yellow"> - plateau reached</Text>
        )}
        {progress.status === "max_iterations" && (
          <Text color="yellow">
            {" "}
            - max iterations ({progress.finalFailures} failures remaining)
          </Text>
        )}
      </Box>

      {/* Show source hints if available */}
      {progress.sourceHints && progress.sourceHints.length > 0 && (
        <Box flexDirection="column" marginLeft={2}>
          <Text dimColor>  💡 Suggested source changes:</Text>
          {progress.sourceHints.map((hint, i) => (
            <Box key={i} flexDirection="column" marginLeft={2}>
              <Text dimColor>
                {hint.action} {hint.stepType}: {hint.suggestion}
              </Text>
              <Text dimColor italic>
                  └ {hint.reason}
              </Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
