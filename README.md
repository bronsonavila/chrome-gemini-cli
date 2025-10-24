# Chrome Gemini CLI

Agentic CLI for AI-powered browser automation. Tell the agent what you want, and it autonomously navigates, clicks, fills forms, and extracts data.

Built with **Gemini AI** and **Chrome DevTools MCP**.

<img src="assets/demo.gif" alt="Demo of the Person-to-Address Search Verifier in action" width="830" />

## Features

- Interactive chat mode with continuous conversation
- Autonomous browser navigation and interaction
- Structured JSON output via custom schemas
- 27 Chrome DevTools automation tools
- Configurable step limits and response formats

## Prerequisites

- Node.js >= 20.19.0
- Google Chrome browser
- [Gemini API key](https://aistudio.google.com/apikey)

## Installation

```bash
pnpm install
cp .env.example .env
# Add your GEMINI_API_KEY to .env
```

## Usage

**Interactive mode:**

```bash
npm start
```

**With initial task:**

```bash
npm start -- "Find iPhone price on Apple's website"
```

**With structured output:**

```bash
npm start -- --schema schemas/examples/price-schema.ts "Get MacBook Pro price"
```

**Configure max steps:**

```bash
npm start -- --max-steps 50 "Complex research task"
```

**Non-interactive mode (exit after task):**

```bash
npm start -- --no-interactive "Quick query that exits when done"
```

**Quiet mode (suppress logs, clean JSON only):**

```bash
npm start --silent -- --no-interactive --schema schemas/examples/price-schema.ts "Get Apple stock price"
```

## Examples

In interactive mode:

```
Prompt: Go to producthunt.com and get today's top 5 products
```

With schemas:

```bash
npm start -- --schema schemas/examples/price-schema.ts "Check Nintendo Switch price on Amazon"
```

For scripting (clean JSON output):

```bash
# Using npm --silent for clean output
npm start --silent -- --no-interactive --schema schemas/examples/price-schema.ts "Get Apple stock price" > output.json
```

**Important:** When redirecting output (`>`) or piping (`|`), always use `npm start --silent` to prevent progress logs from being included in your output file or pipeline.

## Configuration

**Environment (.env file):**

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash      # Default model
GEMINI_THINKING_BUDGET=1024        # Default thinking budget (0 to disable, -1 for dynamic)
```

**CLI Options:**

- `--schema <file>` - TypeScript schema for structured responses
- `--max-steps <num>` - Max steps the agent can take (default: 30)
- `--no-interactive` - Exit after completing task
- `--help` - Show usage

**Note:** Use `npm start --silent` to suppress all logs and get clean JSON output only (perfect for piping/scripting).

**Agent Step Guidelines:**

- Simple tasks: 10-20 steps
- Medium tasks: 30-50 steps
- Complex tasks: 50-100+ steps

## Schemas

Schema files must:

- Be TypeScript (.ts) files
- Import `Type` from `@google/genai`
- Export a schema object with Gemini Type enums

Example (`schemas/examples/price-schema.ts`):

```typescript
import { Type } from '@google/genai'

export const priceSchema = {
  type: Type.OBJECT,
  properties: {
    product: { type: Type.STRING },
    price: { type: Type.STRING },
    available: { type: Type.BOOLEAN }
  },
  required: ['product', 'price']
}
```

Add your own schemas in `schemas/` directory (git-ignored). See `schemas/examples/` for more.
