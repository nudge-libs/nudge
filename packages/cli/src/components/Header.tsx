import { Box, Text } from "ink";

type HeaderProps = {
  title: string;
  subtitle?: string;
};

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="magenta">
        {title}
      </Text>
      {subtitle && <Text dimColor> {subtitle}</Text>}
    </Box>
  );
}
