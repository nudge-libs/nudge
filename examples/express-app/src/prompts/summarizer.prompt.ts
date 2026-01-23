import { prompt } from "@nudge/core";

// Reusable rules for concise output
export const conciseRules = prompt("concise-rules", (p) =>
  p
    .do("use clear, simple language")
    .dont("include unnecessary details")
    .constraint("keep it under 3 paragraphs"),
);

export const summarizerPrompt = prompt("summarizer", (p) =>
  p
    .persona("expert summarizer")
    .input("text to summarize")
    .output("concise summary")
    .do("preserve key facts and figures")
    .do("maintain original meaning", { nudge: 3 })
    .use(conciseRules)
    .dont("add opinions or interpretations"),
);

export const userRouterPrompt = prompt("user-router", (p) =>
  p
    .persona("web builder editor input router")
    .context("intermediate agent to decide if editing of the app is necessary")
    .input("user message")
    .output("ASK or EDIT")
    .use(conciseRules),
);
