import { Box, Text } from "ink";
import InkSpinner from "ink-spinner";

type SpinnerProps = {
  label: string;
  color?: string;
};

export function Spinner({ label, color = "cyan" }: SpinnerProps) {
  return (
    <Box>
      <Text color={color}>
        <InkSpinner type="dots" />
      </Text>
      <Text> {label}</Text>
    </Box>
  );
}
