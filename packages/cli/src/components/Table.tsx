import { Box, Text } from "ink";
import React from "react";

type Column<T> = {
  key: keyof T;
  header: string;
  width?: number;
  color?: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
};

type TableProps<T> = {
  data: T[];
  columns: Column<T>[];
};

export function Table<T extends Record<string, unknown>>({
  data,
  columns,
}: TableProps<T>) {
  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box>
        {columns.map((col, i) => (
          <Box
            key={String(col.key)}
            width={col.width}
            marginRight={i < columns.length - 1 ? 2 : 0}
          >
            <Text bold color="cyan">
              {col.header}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Separator */}
      <Box marginBottom={1}>
        <Text dimColor>
          {"─".repeat(
            columns.reduce((sum, col) => sum + (col.width ?? 10) + 2, 0),
          )}
        </Text>
      </Box>

      {/* Rows */}
      {data.map((row, rowIndex) => (
        <Box key={rowIndex}>
          {columns.map((col, i) => (
            <Box
              key={String(col.key)}
              width={col.width}
              marginRight={i < columns.length - 1 ? 2 : 0}
            >
              <Text color={col.color}>
                {col.render
                  ? col.render(row[col.key], row)
                  : String(row[col.key] ?? "")}
              </Text>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}
