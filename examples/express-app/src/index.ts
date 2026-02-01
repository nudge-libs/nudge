import express from "express";
import "./prompts.gen";
import {
  greeterPrompt,
  summarizerPrompt,
  testPrompt,
} from "./prompts/summarizer.prompt";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  // Test optionals
  console.log(testPrompt.toString());
  console.log("---");
  console.log(testPrompt.toString({}));
  console.log("---");
  // Test variables (name and topic are required, typed!)
  console.log(
    greeterPrompt.toString({
      name: "test",
      topic: "TypeScript",
      introduction: true,
    }),
  );
  // Test variants
  console.log("---");
  console.log(summarizerPrompt.toString({ variant: "short" }));
  console.log("---");
  console.log(summarizerPrompt.toString({ variant: "detailed" }));
  res.json({
    message: "Example Express App",
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
