import express from "express";
import { summarizerPrompt } from "./prompts/summarizer.prompt";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  console.log(summarizerPrompt.toString());
  res.json({
    message: "Example Express App",
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
