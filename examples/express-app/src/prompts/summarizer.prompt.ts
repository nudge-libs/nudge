import { prompt } from "@nudge-ai/core";

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
    .dont("add opinions or interpretations")
    .optional("json", (p) =>
      p.output("valid JSON object").constraint("must be parseable JSON"),
    ),
);

export const userRouterPrompt = prompt("user-router", (p) =>
  p
    .persona("web builder editor input router")
    .context("intermediate agent to decide if editing of the app is necessary")
    .input("user message")
    .output("ASK or EDIT")
    .use(conciseRules),
);

export const testPrompt = prompt("test", (p) =>
  p
    .raw("First Test")
    .optional("extra", (p) =>
      p.raw("Testing Extra").optional("more", (p) => p.raw("More Testing")),
    ),
);

export const greeterPrompt = prompt("greeter", (p) =>
  p
    .persona("friendly assistant helping {{name}}")
    .context("the user wants to learn about {{topic}}")
    .optional("introduction", (p) => p.do("start with a warm greeting"))
    .input("the user's name and chosen topic")
    .output("a personalized greeting message")
    .do("address the user by name")
    .do("focus discussion on their chosen topic"),
);
