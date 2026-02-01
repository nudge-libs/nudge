/**
 * Format API errors with helpful context for users
 */
export function formatAPIError(
  error: unknown,
  context: { model: string; operation: string },
): string {
  const { model, operation } = context;

  // Network/connection errors
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return `
Network error while ${operation}.

Could not connect to the AI provider. Please check:
  • Your internet connection
  • The API base URL in nudge.config.json
  • If using a local model, ensure it's running
`;
  }

  // Handle our custom errors
  if (error instanceof Error) {
    const msg = error.message;

    // HTTP status code errors
    if (msg.includes("401")) {
      return `
Authentication failed (401) while ${operation}.

Please check:
  • Your API key environment variable is set correctly
  • The API key is valid and not expired
  • The API key has the required permissions
`;
    }

    if (msg.includes("403")) {
      return `
Access forbidden (403) while ${operation}.

Please check:
  • Your API key has access to the model "${model}"
  • You have sufficient quota/credits
`;
    }

    if (msg.includes("404")) {
      return `
Model not found (404) while ${operation}.

The model "${model}" was not found. Please check:
  • The model name is spelled correctly in nudge.config.json
  • The model is available with your provider
  • For OpenRouter: use format "provider/model-name"
`;
    }

    if (msg.includes("429")) {
      return `
Rate limit exceeded (429) while ${operation}.

You've hit the API rate limit. Please:
  • Wait a moment and try again
  • Consider using a different model
  • Check your API plan limits
`;
    }

    if (msg.includes("500") || msg.includes("502") || msg.includes("503")) {
      return `
Server error while ${operation}.

The AI provider is experiencing issues. Please:
  • Wait a moment and try again
  • Check the provider's status page
`;
    }

    // Empty response
    if (msg.includes("empty") || msg.includes("no content")) {
      return `
Empty response while ${operation}.

The model "${model}" returned an empty response. This can happen with:
  • Smaller/local models that don't handle the task well
  • Models with very short context windows

Try using a more capable model (e.g., gpt-4o, claude-3.5-sonnet).
`;
    }

    // JSON parsing errors
    if (msg.includes("JSON") || msg.includes("parse") || msg.includes("Unexpected token")) {
      return `
Invalid response format while ${operation}.

The model "${model}" didn't return valid JSON. This often happens with:
  • Smaller models that don't follow instructions well
  • Local models without proper instruction tuning

Try using a more capable model that follows structured output formats.
`;
    }

    // Zod validation errors
    if (msg.includes("validation") || msg.includes("Expected")) {
      return `
Unexpected response structure while ${operation}.

The model "${model}" returned an unexpected format.
This can happen with models that don't follow instructions precisely.

Try using a more capable model (e.g., gpt-4o, claude-3.5-sonnet).
`;
    }

    // Return the original error if we don't have a specific handler
    return msg;
  }

  return String(error);
}

/**
 * Wrap an async operation with better error handling
 */
export async function withErrorHandling<T>(
  operation: string,
  model: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw new Error(formatAPIError(error, { model, operation }));
  }
}

/**
 * Format a warning message for non-fatal issues
 */
export function formatWarning(message: string): string {
  return `⚠️  ${message}`;
}

/**
 * Check if a model response looks valid (non-empty, reasonable length)
 */
export function validateModelResponse(
  response: string,
  context: { model: string; operation: string },
): void {
  if (!response || response.trim().length === 0) {
    throw new Error(
      formatAPIError(new Error("empty response"), context),
    );
  }

  // Warn if response seems too short (likely model didn't understand)
  if (response.trim().length < 10) {
    console.warn(
      formatWarning(
        `Model returned a very short response. This may indicate the model "${context.model}" is struggling with the task.`,
      ),
    );
  }
}
