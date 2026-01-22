import { prompt } from "@nudge/core";

export const summarizerPrompt = prompt("summarizer", (p) =>
  p
    .persona("summarizer")
    .raw("Summarize the given text")
    .raw("Do not add any fluff."),
);
