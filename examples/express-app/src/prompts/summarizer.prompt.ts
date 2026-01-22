import { prompt } from "@nudge/core";

export const summarizerPrompt = prompt("summarizer", (p) =>
  p
    .persona("expert summarizer")
    .input("text to summarize")
    .output("concise summary")
    .do("preserve key facts and figures")
    .do("maintain original meaning", { nudge: 3 })
    .do("use clear, simple language")
    .dont("add opinions or interpretations")
    .dont("include unnecessary details")
    .constraint("keep it under 3 paragraphs"),
);
