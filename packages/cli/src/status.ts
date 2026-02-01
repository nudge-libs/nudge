/**
 * Status utilities for CLI feedback during long-running operations.
 * Uses ANSI escape codes for terminal manipulation.
 */

const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

type Spinner = {
  update: (text: string) => void;
  stop: (finalText?: string) => void;
  succeed: (text?: string) => void;
  fail: (text?: string) => void;
};

/**
 * Creates an animated spinner for long-running operations.
 */
export function createSpinner(initialText: string): Spinner {
  let frameIndex = 0;
  let currentText = initialText;
  let isRunning = true;

  const isTTY = process.stdout.isTTY;

  const render = () => {
    if (!isTTY) return;
    const frame = spinnerFrames[frameIndex];
    process.stdout.write(`\r\x1b[K${frame} ${currentText}`);
    frameIndex = (frameIndex + 1) % spinnerFrames.length;
  };

  const interval = isTTY ? setInterval(render, 80) : null;
  render();

  // For non-TTY, just print the initial message
  if (!isTTY) {
    console.log(`  ${initialText}...`);
  }

  return {
    update(text: string) {
      currentText = text;
      if (!isTTY) {
        console.log(`  ${text}...`);
      }
    },
    stop(finalText?: string) {
      if (!isRunning) return;
      isRunning = false;
      if (interval) clearInterval(interval);
      if (isTTY) {
        process.stdout.write(`\r\x1b[K`);
        if (finalText) {
          console.log(finalText);
        }
      }
    },
    succeed(text?: string) {
      if (!isRunning) return;
      isRunning = false;
      if (interval) clearInterval(interval);
      if (isTTY) {
        process.stdout.write(`\r\x1b[K`);
      }
      if (text) {
        console.log(`  ✓ ${text}`);
      }
    },
    fail(text?: string) {
      if (!isRunning) return;
      isRunning = false;
      if (interval) clearInterval(interval);
      if (isTTY) {
        process.stdout.write(`\r\x1b[K`);
      }
      if (text) {
        console.log(`  ✗ ${text}`);
      }
    },
  };
}

type ProgressOptions = {
  total: number;
  label?: string;
};

type Progress = {
  update: (current: number, itemLabel?: string) => void;
  increment: (itemLabel?: string) => void;
  done: () => void;
};

/**
 * Creates a progress tracker for loops/iterations.
 */
export function createProgress(options: ProgressOptions): Progress {
  let current = 0;
  const { total, label = "Processing" } = options;
  const isTTY = process.stdout.isTTY;

  const render = (itemLabel?: string) => {
    const progress = `[${current}/${total}]`;
    const text = itemLabel ? `${label} ${progress} ${itemLabel}` : `${label} ${progress}`;
    if (isTTY) {
      process.stdout.write(`\r\x1b[K  ${text}`);
    }
  };

  return {
    update(newCurrent: number, itemLabel?: string) {
      current = newCurrent;
      render(itemLabel);
    },
    increment(itemLabel?: string) {
      current++;
      render(itemLabel);
    },
    done() {
      if (isTTY) {
        process.stdout.write(`\r\x1b[K`);
      }
    },
  };
}

/**
 * Wraps an async operation with a spinner.
 */
export async function withSpinner<T>(
  text: string,
  operation: () => Promise<T>,
  options?: { successText?: string; failText?: string },
): Promise<T> {
  const spinner = createSpinner(text);
  try {
    const result = await operation();
    spinner.succeed(options?.successText);
    return result;
  } catch (error) {
    spinner.fail(options?.failText);
    throw error;
  }
}

/**
 * Status line that can be updated in place.
 */
export function statusLine(text: string): void {
  const isTTY = process.stdout.isTTY;
  if (isTTY) {
    process.stdout.write(`\r\x1b[K  ${text}`);
  } else {
    console.log(`  ${text}`);
  }
}

/**
 * Clear the current status line.
 */
export function clearStatusLine(): void {
  if (process.stdout.isTTY) {
    process.stdout.write(`\r\x1b[K`);
  }
}
