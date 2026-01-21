import { prompt } from "@nudge/core";

export const summarizerPrompt = prompt("summarizer", (p) =>
  p.raw("You are a helpful assistant that summarizes text."),
);
