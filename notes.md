# Nudge

- different models have different prompt styles -> changing the model changes the prompt
- emphasis thing
- personas/role play thing: pretend to be blah blah blah..., this can be inferred by an LLM
- builder pattern is cool but maybe not the best way idk
- nuggets



```ts
import { prompt, workflowStep, outputs, param } from "@nudge/core";

const planStep = plan('design the ui').nudge(10)

const myPrompt =
    prompt('my-prompt-id')
        .persona()
        .workflow([
            workflowStep(),
            planStep,
            workflowStep(),
            planStep
        ])

const textPrompt = myPrompt.toString({ model: "claude" })
const jsonPrompt = myPrompt.toJson()



const userLocale = 'de'

const messageSummarizerPrompt =
    prompt('summarizer-agent')
        .input('user message history')
        .output(
            // outputs.summary -> eww
            outputs
                .summary()
                .noFluff(5)
                .localize(param(userLocale))
                .do('keep everything', 2)
                .dont('invent stuff')
        )
        .toString()
```


### Nuding Levels

Note on deterministic output:
- we can define in the system prompt what specific values mean
- e.g. 1 = emphasize a bit, 2 = emphasize moderately, 3 = emphasize a lot
- we can also give specific examples or words to use to emphasize so we get consistent outputs 