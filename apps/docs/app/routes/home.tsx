import { baseOptions } from "@/lib/layout.shared";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { Link } from "react-router";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Nudge - AI-powered prompt codegen" },
    {
      name: "description",
      content: "A prompt builder with AI-powered codegen for AI applications.",
    },
  ];
}

const builderCode = `import { prompt } from "@nudge/core";

export const summarizer = prompt("summarizer", (p) =>
  p
    .persona("expert summarizer")
    .input("text to summarize")
    .output("concise summary")
    .do("preserve key facts")
    .dont("add opinions")
    .constraint("max 3 paragraphs")
);`;

const generatedCode = `You are an expert summarizer. Your task is to 
condense information while maintaining accuracy 
and clarity.

**Input:** You will receive text to summarize.

**Output:** Provide a concise summary.

**Guidelines:**
- Preserve key facts and important details
- Avoid adding personal opinions or interpretations
- Keep your response to a maximum of 3 paragraphs`;

export default function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <div className="flex flex-col items-center flex-1 px-4 py-16 md:py-24">
        {/* Hero */}
        <div className="text-center max-w-2xl mb-16">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-6">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
            </span>
            Pre-release
          </span>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-5 text-balance tracking-tight">
            Type-safe prompt engineering for production AI
          </h1>
          <p className="text-fd-muted-foreground text-base md:text-lg text-pretty max-w-xl mx-auto">
            Define prompts with a fluent builder. Let AI generate optimized
            system prompts. Ship with confidence.
          </p>
        </div>

        {/* Install + CTA */}
        <div className="flex flex-col items-center gap-4 mb-14">
          <code className="bg-fd-muted/50 border border-fd-border rounded-md px-4 py-2 text-sm">
            <span className="text-fd-muted-foreground select-none">$ </span>
            <span className="text-fd-foreground">
              npm i @nudge/core @nudge/cli
            </span>
          </code>
          <div className="flex gap-3">
            <Link
              className="bg-fd-primary text-fd-primary-foreground rounded-md font-medium px-5 py-2 text-sm hover:opacity-90 transition-opacity"
              to="/docs"
            >
              Get Started
            </Link>
            <a
              className="border border-fd-border text-fd-foreground rounded-md font-medium px-5 py-2 text-sm hover:bg-fd-accent transition-colors"
              href="https://github.com/nudge-libs/nudge"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>

        {/* Main code example - side by side */}
        <div className="w-full max-w-5xl mb-20">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Builder input */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-2.5 px-0.5">
                <div className="w-2 h-2 rounded-full bg-fd-primary"></div>
                <span className="text-sm text-fd-muted-foreground">
                  Your code
                </span>
              </div>
              <div className="flex-1 overflow-hidden rounded-xl border border-fd-border [&_pre]:!my-0 [&_pre]:!rounded-xl [&_figure]:!my-0 [&_figure]:h-full">
                <DynamicCodeBlock lang="typescript" code={builderCode} />
              </div>
            </div>

            {/* Generated output */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-2.5 px-0.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-sm text-fd-muted-foreground">
                  Generated prompt
                </span>
              </div>
              <div className="flex-1 overflow-hidden rounded-xl border border-fd-border [&_pre]:!my-0 [&_pre]:!rounded-xl [&_figure]:!my-0 [&_figure]:h-full">
                <DynamicCodeBlock lang="markdown" code={generatedCode} />
              </div>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="w-full max-w-3xl mb-20">
          <h2 className="text-sm font-medium text-fd-muted-foreground text-center mb-8 uppercase tracking-wider">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-fd-primary/10 text-fd-primary text-sm font-semibold mb-3">
                1
              </div>
              <h3 className="font-semibold mb-1.5">Define</h3>
              <p className="text-fd-muted-foreground text-sm">
                Write prompts in TypeScript with full autocomplete
              </p>
            </div>
            <div>
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-fd-primary/10 text-fd-primary text-sm font-semibold mb-3">
                2
              </div>
              <h3 className="font-semibold mb-1.5">Generate</h3>
              <p className="text-fd-muted-foreground text-sm">
                AI synthesizes optimized system prompts
              </p>
            </div>
            <div>
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-fd-primary/10 text-fd-primary text-sm font-semibold mb-3">
                3
              </div>
              <h3 className="font-semibold mb-1.5">Ship</h3>
              <p className="text-fd-muted-foreground text-sm">
                Import and use anywhere in your app
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="w-full max-w-3xl">
          <h2 className="text-sm font-medium text-fd-muted-foreground text-center mb-8 uppercase tracking-wider">
            Features
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-fd-border bg-fd-card/50">
              <h3 className="font-medium text-sm mb-1">Type-Safe</h3>
              <p className="text-fd-muted-foreground text-xs leading-relaxed">
                Full TypeScript support with autocomplete
              </p>
            </div>
            <div className="p-4 rounded-xl border border-fd-border bg-fd-card/50">
              <h3 className="font-medium text-sm mb-1">AI-Powered</h3>
              <p className="text-fd-muted-foreground text-xs leading-relaxed">
                Generates optimized system prompts
              </p>
            </div>
            <div className="p-4 rounded-xl border border-fd-border bg-fd-card/50">
              <h3 className="font-medium text-sm mb-1">Cached</h3>
              <p className="text-fd-muted-foreground text-xs leading-relaxed">
                Only regenerates changed prompts
              </p>
            </div>
            <div className="p-4 rounded-xl border border-fd-border bg-fd-card/50">
              <h3 className="font-medium text-sm mb-1">Composable</h3>
              <p className="text-fd-muted-foreground text-xs leading-relaxed">
                Share logic across prompts
              </p>
            </div>
            <div className="p-4 rounded-xl border border-fd-border bg-fd-card/50">
              <h3 className="font-medium text-sm mb-1">Variables</h3>
              <p className="text-fd-muted-foreground text-xs leading-relaxed">
                Dynamic prompts with typed placeholders
              </p>
            </div>
            <div className="p-4 rounded-xl border border-fd-border bg-fd-card/50">
              <h3 className="font-medium text-sm mb-1">Optional Blocks</h3>
              <p className="text-fd-muted-foreground text-xs leading-relaxed">
                Toggle sections at runtime
              </p>
            </div>
          </div>
        </div>
      </div>
    </HomeLayout>
  );
}
