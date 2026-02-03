import { Box, Text } from "ink";
import React from "react";

type StatusType = "success" | "error" | "warning" | "info";

type StatusMessageProps = {
  type: StatusType;
  children: React.ReactNode;
};

const STATUS_ICONS: Record<StatusType, string> = {
  success: "✓",
  error: "✗",
  warning: "⚠",
  info: "ℹ",
};

const STATUS_COLORS: Record<StatusType, string> = {
  success: "green",
  error: "red",
  warning: "yellow",
  info: "blue",
};

export function StatusMessage({ type, children }: StatusMessageProps) {
  return (
    <Box>
      <Text color={STATUS_COLORS[type]}>{STATUS_ICONS[type]} </Text>
      <Text>{children}</Text>
    </Box>
  );
}

export function Success({ children }: { children: React.ReactNode }) {
  return <StatusMessage type="success">{children}</StatusMessage>;
}

export function Error({ children }: { children: React.ReactNode }) {
  return <StatusMessage type="error">{children}</StatusMessage>;
}

export function Warning({ children }: { children: React.ReactNode }) {
  return <StatusMessage type="warning">{children}</StatusMessage>;
}

export function Info({ children }: { children: React.ReactNode }) {
  return <StatusMessage type="info">{children}</StatusMessage>;
}
