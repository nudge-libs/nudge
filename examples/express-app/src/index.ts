import express from "express";
import "./prompts.gen";
import { greeterPrompt, testPrompt } from "./prompts/summarizer.prompt";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  // Test optionals
  console.log(testPrompt.toString());
  console.log("---");
  console.log(testPrompt.toString({ extra: true, more: true }));
  console.log("---");
  // Test variables (name and topic are required, typed!)
  console.log(
    greeterPrompt.toString({
      name: "Alice",
      topic: "TypeScript",
      introduction: true,
    }),
  );
  res.json({
    message: "Example Express App",
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
