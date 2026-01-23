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
      <div className="flex flex-col items-center flex-1 px-4 py-12">
        {/* Hero */}
        <div className="text-center max-w-3xl mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            Pre-release
          </span>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">
            A gentle nudge toward production-ready AI
          </h1>
          <p className="text-fd-muted-foreground text-lg text-pretty">
            Define prompts with a type-safe builder. AI generates optimized
            system prompts. Ship better AI apps with ease.
          </p>
        </div>

        {/* Main code example - side by side */}
        <div className="w-full max-w-5xl mb-12">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Builder input */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className="w-2 h-2 rounded-full bg-fd-primary"></div>
                <span className="text-sm font-medium">Define with builder</span>
              </div>
              <div className="flex-1 overflow-hidden rounded-lg border border-fd-border [&_pre]:!my-0 [&_pre]:!rounded-lg [&_figure]:!my-0 [&_figure]:h-full">
                <DynamicCodeBlock lang="typescript" code={builderCode} />
              </div>
            </div>

            {/* Generated output */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium">AI generates prompt</span>
              </div>
              <div className="flex-1 overflow-hidden rounded-lg border border-fd-border [&_pre]:!my-0 [&_pre]:!rounded-lg [&_figure]:!my-0 [&_figure]:h-full">
                <DynamicCodeBlock lang="markdown" code={generatedCode} />
              </div>
            </div>
          </div>
        </div>

        {/* Install + CTA */}
        <div className="flex flex-col items-center gap-4 mb-16">
          <div className="bg-fd-card border border-fd-border rounded-lg px-4 py-2.5 font-mono text-sm">
            <span className="text-fd-muted-foreground">npm install </span>
            <span className="text-fd-foreground">@nudge/core @nudge/cli</span>
          </div>
          <div className="flex gap-3">
            <Link
              className="bg-fd-primary text-fd-primary-foreground rounded-full font-medium px-5 py-2 text-sm hover:opacity-90 transition-opacity"
              to="/docs"
            >
              Get Started
            </Link>
            <a
              className="border border-fd-border text-fd-foreground rounded-full font-medium px-5 py-2 text-sm hover:bg-fd-accent transition-colors"
              href="https://github.com/nicolodaddabbo/nudge"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>

        {/* How it works - compact */}
        <div className="w-full max-w-4xl mb-16">
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div>
              <div className="text-fd-primary font-bold text-sm mb-1">01</div>
              <h3 className="font-semibold mb-1">Define</h3>
              <p className="text-fd-muted-foreground text-sm">
                Write prompts in TypeScript with a fluent builder API. Full
                autocomplete and type safety.
              </p>
            </div>
            <div>
              <div className="text-fd-primary font-bold text-sm mb-1">02</div>
              <h3 className="font-semibold mb-1">Generate</h3>
              <p className="text-fd-muted-foreground text-sm">
                Run the CLI. AI synthesizes your definitions into optimized
                system prompts.
              </p>
            </div>
            <div>
              <div className="text-fd-primary font-bold text-sm mb-1">03</div>
              <h3 className="font-semibold mb-1">Use</h3>
              <p className="text-fd-muted-foreground text-sm">
                Import once, use anywhere. Prompts are cached—only regenerate
                when changed.
              </p>
            </div>
          </div>
        </div>

        {/* Features - compact grid */}
        <div className="w-full max-w-4xl">
          <h2 className="text-xl font-bold mb-6 text-center">Features</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-left">
            <div className="bg-fd-card border border-fd-border rounded-lg p-4">
              <h3 className="font-medium text-sm mb-0.5">Type-Safe</h3>
              <p className="text-fd-muted-foreground text-xs">
                Full TypeScript support with autocomplete
              </p>
            </div>
            <div className="bg-fd-card border border-fd-border rounded-lg p-4">
              <h3 className="font-medium text-sm mb-0.5">AI-Powered</h3>
              <p className="text-fd-muted-foreground text-xs">
                Generates optimized system prompts
              </p>
            </div>
            <div className="bg-fd-card border border-fd-border rounded-lg p-4">
              <h3 className="font-medium text-sm mb-0.5">Cached</h3>
              <p className="text-fd-muted-foreground text-xs">
                Only regenerates changed prompts
              </p>
            </div>
            <div className="bg-fd-card border border-fd-border rounded-lg p-4">
              <h3 className="font-medium text-sm mb-0.5">Composable</h3>
              <p className="text-fd-muted-foreground text-xs">
                Share rules across prompts with .use()
              </p>
            </div>
            <div className="bg-fd-card border border-fd-border rounded-lg p-4">
              <h3 className="font-medium text-sm mb-0.5">Variables</h3>
              <p className="text-fd-muted-foreground text-xs">
                Dynamic prompts with typed placeholders
              </p>
            </div>
            <div className="bg-fd-card border border-fd-border rounded-lg p-4">
              <h3 className="font-medium text-sm mb-0.5">Optional Blocks</h3>
              <p className="text-fd-muted-foreground text-xs">
                Toggle sections at runtime
              </p>
            </div>
          </div>
        </div>
      </div>
    </HomeLayout>
  );
}
