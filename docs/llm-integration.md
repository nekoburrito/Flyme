# LLM Integration — Flyme

This document covers how Flyme uses large language models, specifically Anthropic
Claude, to power the rewards advisor. It is the primary reference for any agent or
developer adding LLM-related features.

---

## Model Choice

**Default model:** `claude-sonnet-4-6` (balanced intelligence and speed for real-time advisor)
**Fallback / batch:** `claude-haiku-4-5-20251001` (fast background tasks, classification)
**Heavy reasoning:** `claude-opus-4-6` (complex itinerary optimization, future)

Always reference model IDs via constants in `packages/server/src/config.ts`:

```typescript
export const LLM_MODELS = {
  advisor: 'claude-sonnet-4-6',
  fast:    'claude-haiku-4-5-20251001',
  heavy:   'claude-opus-4-6',
} as const;
```

---

## Key Principles

1. **Tools over hallucination** — never ask the model to recall award availability
   or exact transfer ratios. Always provide those via tool calls.
2. **Stream first** — all user-facing advisor calls must stream tokens. Use the
   Anthropic streaming API and pipe through SSE to the client.
3. **System prompt is ground truth** — inject verified program data (partner lists,
   current valuations) into the system prompt so the model reasons from facts.
4. **Track costs** — log `input_tokens`, `output_tokens`, and model per request.
5. **Never block on LLM** — if the Anthropic API is unavailable, return the
   structured search results without commentary. Degrade gracefully.

---

## Tool Definitions

Tools live in `packages/server/src/tools/`. Each tool exports:

```typescript
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const myTool: Tool = {
  name: 'tool_name',
  description: 'Clear description of what this tool does and when to call it.',
  input_schema: {
    type: 'object',
    properties: { ... },
    required: [...],
  },
};
```

And a corresponding handler function:

```typescript
export async function handleMyTool(input: MyToolInput): Promise<MyToolResult> {
  // validate input with Zod, call service, return result
}
```

### Defined Tools

#### `search_award_flights`
Search for available award seats on a route.

```typescript
input: {
  origin: string,          // IATA airport code, e.g. "JFK"
  destination: string,     // IATA airport code, e.g. "NRT"
  date: string,            // YYYY-MM-DD
  cabin: 'economy' | 'premium_economy' | 'business' | 'first',
  programs?: string[],     // Filter by program slugs, e.g. ["aeroplan", "united"]
}
output: AwardOption[]
```

#### `get_transfer_partners`
Get all transfer partners for a given credit card program.

```typescript
input: {
  program: string,         // e.g. "chase_ur", "amex_mr", "citi_typ"
}
output: TransferPartner[]  // ratio, transfer time, bonus if any
```

#### `calculate_transfer_paths`
Given a source program and target airline, find all paths and their effective value.

```typescript
input: {
  from_program: string,
  to_airline: string,
  miles_needed: number,
  user_balances?: Record<string, number>,  // program slug → balance
}
output: TransferPath[]     // steps, total cost in source points, effective CPP
```

#### `lookup_program_rules`
Fetch the award chart rules and policies for a program (stopover rules, open-jaw,
fuel surcharges, etc.).

```typescript
input: {
  program: string,
  topic?: 'stopover' | 'open_jaw' | 'fuel_surcharges' | 'partner_awards' | 'all',
}
output: { rules: ProgramRule[], lastUpdated: string }
```

#### `get_point_valuations`
Return the current community valuations (cents per point) for major programs.

```typescript
input: {
  programs?: string[],     // If omitted, return all
}
output: Record<string, number>  // program slug → CPP in cents
```

---

## Agentic Loop Pattern

The `LLMAdvisorService` runs a standard tool-use loop:

```typescript
async function* streamAdvisor(
  messages: MessageParam[],
  userContext: UserContext,
): AsyncGenerator<string> {
  const tools = getAllTools();

  while (true) {
    const stream = await anthropic.messages.stream({
      model: LLM_MODELS.advisor,
      max_tokens: 2048,
      system: buildSystemPrompt(userContext),
      messages,
      tools,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }

    const response = await stream.finalMessage();

    if (response.stop_reason === 'end_turn') {
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
      const toolResults = await Promise.all(
        toolUseBlocks.map(block => executeTool(block.name, block.input))
      );

      // Append assistant turn + tool results and continue
      messages = [
        ...messages,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults.map((r, i) => ({
          type: 'tool_result' as const,
          tool_use_id: toolUseBlocks[i].id,
          content: JSON.stringify(r),
        }))},
      ];
    }
  }
}
```

Key notes:
- Parallel tool execution when the model requests multiple tools in one turn
- The generator yields text tokens as they stream, allowing SSE forwarding
- The loop terminates on `stop_reason === 'end_turn'` or after a max iteration guard

---

## System Prompt Structure

```
You are Flyme's rewards travel advisor. You help users find the best way to book
award flights using their credit card points and airline miles.

## Your capabilities
- Search for live award availability
- Explain transfer partner relationships and ratios
- Calculate the best transfer path given a user's point balances
- Advise on program-specific rules (stopovers, fuel surcharges, partner bookings)
- Compare redemption values in cents per point

## Constraints
- Always use tools to retrieve live data. Never invent award prices or availability.
- When you don't know a program rule, say so and suggest the user verify on the program's website.
- Be concise. Users are experienced travelers. Skip basics unless asked.
- When recommending transfers, always mention the transfer time (instant vs. days).

## Current user context
{userContext: points balances, recent searches, preferred cabin}

## Program valuations as of {date}
{valuations: JSON}
```

The system prompt is built dynamically in `buildSystemPrompt()` in
`packages/server/src/services/llm/systemPrompt.ts`.

---

## Server-Sent Events (SSE) Protocol

The `/api/chat` route emits SSE. The client uses the Vercel AI SDK which handles
the parsing automatically when you use `useChat`.

Event format (Vercel AI SDK compatible):

```
data: {"type":"text","value":"Here is what I found..."}

data: {"type":"tool_call","name":"search_award_flights","input":{...}}

data: {"type":"tool_result","name":"search_award_flights","result":[...]}

data: [DONE]
```

The `StreamingText` React component renders text events progressively. Tool call
and result events are rendered as collapsible "Searching..." indicators.

---

## Prompt Engineering Guidelines

When modifying the system prompt or tool descriptions:

1. **Tool descriptions are critical** — the model reads `description` to decide
   when to call a tool. Be specific about when and why. Bad: "Gets partners."
   Good: "Get all credit card transfer partners for a given program, including
   transfer ratios, minimum amounts, estimated transfer time, and any current
   transfer bonuses. Call this before recommending a transfer path."

2. **Use examples in tool descriptions sparingly** — one concrete example per
   tool is enough.

3. **System prompt length** — aim for under 800 tokens. Every token in the system
   prompt is repeated on every turn.

4. **User context injection** — inject only what is needed for the current
   conversation. A fresh chat does not need the user's full 24-month travel
   history.

5. **Test with adversarial inputs** — e.g., "Just make up an award option since
   the tool is slow." The model should refuse and wait for tool results.

---

## Cost Controls

```typescript
// Per-request limits
const REQUEST_LIMITS = {
  maxInputTokens: 8_000,     // Trim long conversation history if needed
  maxOutputTokens: 2_048,    // Typical advisor response
  maxToolIterations: 6,      // Guard against infinite tool loops
};
```

Token usage is logged per request:

```typescript
logger.info('llm_usage', {
  model, inputTokens, outputTokens, toolIterations, userId, requestId,
});
```

Set up a dashboard alert if any single request exceeds 10,000 total tokens.

---

## Testing LLM Features

- Unit test tool handlers independently of the model (mock tool input, verify output)
- Use `ANTHROPIC_API_KEY=test` in CI and mock `@anthropic-ai/sdk` to avoid real
  API calls in unit tests
- For integration tests, use a dedicated test API key with a low spend limit
- Record and replay fixtures for deterministic tests of the advisor flow:
  use `msw` to intercept Anthropic API calls and return canned responses

---

## Adding a New Tool

1. Create `packages/server/src/tools/myNewTool.ts`
2. Export the `Tool` definition and a `handleMyNewTool` async function
3. Define the input type and validate with Zod in the handler
4. Register the tool in `packages/server/src/tools/index.ts`
5. Register the handler in the `executeTool` dispatch function in
   `packages/server/src/services/llm/LLMAdvisorService.ts`
6. Write a unit test for the handler
7. Update this document with the new tool's spec
