import { Box, Text } from "ink";

type ProgressBarProps = {
  current: number;
  total: number;
  label?: string;
  width?: number;
};

export function ProgressBar({
  current,
  total,
  label,
  width = 30,
}: ProgressBarProps) {
  const progress = Math.min(1, current / total);
  const filled = Math.round(progress * width);
  const empty = width - filled;

  const bar = "█".repeat(filled) + "░".repeat(empty);
  const percent = Math.round(progress * 100);

  return (
    <Box>
      <Text color="cyan">{bar}</Text>
      <Text> {percent}%</Text>
      {label && <Text dimColor> · {label}</Text>}
      <Text dimColor>
        {" "}
        ({current}/{total})
      </Text>
    </Box>
  );
}
