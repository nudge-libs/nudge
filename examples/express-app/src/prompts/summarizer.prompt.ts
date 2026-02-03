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
    )
    // A/B testing variants - each adds different constraints to the base prompt
    .variant("short", (v) =>
      v.constraint("keep the summary to 1-2 sentences maximum"),
    )
    .variant("detailed", (v) =>
      v
        .do("explain the context and background")
        .do("include specific examples where relevant"),
    )
    // Tests for evaluating prompt quality
    // These tests are designed to catch common summarization issues
    // that the improve command can fix by refining the prompt
    .test(
      "The company reported Q3 earnings of $5.2 billion, up 12% from last year. The CEO expressed optimism about future growth prospects.",
      (output) =>
        output.includes("$5.2 billion") &&
        !output.toLowerCase().includes("impressive") &&
        !output.toLowerCase().includes("strong") &&
        !output.toLowerCase().includes("excellent"),
      "Should preserve exact figures without adding qualitative language",
    )
    .test(
      "Scientists discovered a new species of deep-sea fish at 8,200 meters depth. The fish has bioluminescent properties and measures approximately 15cm in length.",
      (output) =>
        output.includes("8,200") &&
        output.includes("15") &&
        !output.includes("•") &&
        !output.includes("-  "),
      "Should include all numbers and avoid bullet point formatting",
    )
    .test(
      "The patient received 500mg of medication twice daily for 14 days. Blood pressure decreased from 150/95 to 120/80 mmHg.",
      "must include all dosage numbers (500mg, twice daily, 14 days) and both blood pressure readings exactly as stated",
    )
    // These tests will likely fail initially and demonstrate the improve command
    .test(
      "Artificial intelligence is transforming multiple industries including healthcare, finance, and manufacturing. Machine learning models can now analyze complex data patterns faster than human analysts. Companies investing in AI report productivity gains of 20-40%. However, challenges remain around data privacy, regulatory compliance, and workforce adaptation.",
      (output) => output.split("\n").length <= 2,
      "Summary should be exactly 1-2 lines maximum for quick reading",
    )
    .test(
      "The new smartphone features a 6.8-inch display, 5000mAh battery, triple camera system with 200MP main sensor, and starts at $999. It supports 5G connectivity and includes an advanced AI chip for on-device processing.",
      "should format the key specs as a clean, easy-to-scan list with bullet points or line breaks",
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
