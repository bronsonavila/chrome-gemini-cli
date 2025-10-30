# Chrome Gemini CLI

CLI for AI-powered browser automation. Tell the agent what you want, and it autonomously navigates, clicks, fills forms, and extracts data.

Built with **Gemini AI** and **Chrome DevTools MCP**.

## Demo

> Go to Best Buy and search for '4K TV'. Next, apply the following filters: made by Sony, on sale, 65-74 inches, and rated 4 stars or higher. Then, set the max price to $1000. Finally, sort by 'Best Selling' and list only the results that can be added to the cart.

<img src="assets/demo.gif" alt="Demo of Chrome Gemini CLI searching Best Buy for 4K TVs with filters" />

## Prerequisites

- Node.js >= 20.19.0
- Google Chrome browser
- [Gemini API key](https://aistudio.google.com/apikey)

## Installation

```bash
pnpm install
cp .env.example .env
# Add your GEMINI_API_KEY to .env

# Optionally, create your own config to override defaults
cp .chrome-geminirc.default.json .chrome-geminirc.json
```

## Usage

**Default Interactive Mode:**

Starts a chat session.

```bash
npm start
```

**Run a Task:**

Executes a one-off task with default settings.

```bash
npm start -- "Find Honolulu's weather on Google"
```

**Using a Preset:**

Executes a task using a named preset for configured, non-interactive, or schema-driven tasks.

```bash
# This assumes a "product-scrape" preset exists in your config
# that sets a schema and disables interactive mode.
npm start -- --preset product-scrape "Get the top 3 laptops from Best Buy"
```

**Scripting (Quiet Mode):**

For clean JSON output suitable for piping or redirecting, use `npm start --silent`.

```bash
# Using a preset and piping output to a file
npm start --silent -- --preset product-scrape "Get the top 3 laptops" > output/laptops.json
```

**Important:** When redirecting output (`>`) or piping (`|`), always use `npm start --silent` to prevent progress logs from appearing in your output.

## Configuration

Chrome Gemini CLI uses an opinionated configuration system where the config file controls all non-secret settings.

Configuration is resolved in this order (highest to lowest priority):

1. **CLI Flags** - For temporary, one-time overrides (presets only).
2. **Project Config** - `.chrome-geminirc.json` in the current directory (optional, overrides defaults).
3. **Default Config** - `.chrome-geminirc.default.json` (built-in, always present).

### Environment Variables (`.env` file)

Environment variables are used **strictly for secrets**. All other configuration belongs in a config file.

```env
# .env
GEMINI_API_KEY=your_key_here
```

### Configuration Files

This is the standard way to configure the CLI.

**Project Config (`.chrome-geminirc.json`):**

Create this in your project's root directory. It controls how the tool should behave.

```json
{
  "interactive": true,
  "maxSteps": 30,
  "model": "gemini-2.5-flash",
  "requestDelayMs": 1000,
  "schema": "",
  "temperature": 0,
  "thinkingBudget": 1024,

  "presets": {
    "quick": {
      "maxSteps": 20,
      "interactive": false
    },
    "research": {
      "maxSteps": 50,
      "thinkingBudget": 4096
    }
  }
}
```

**Configuration Fields:**

- `interactive` - Enable interactive chat mode after task completion
- `maxSteps` - Maximum number of agent steps before stopping
- `model` - Gemini model to use (e.g., `gemini-2.5-flash`, `gemini-2.5-pro`)
- `requestDelayMs` - Delay in milliseconds between Gemini API calls to prevent rate limiting
- `schema` - Path to a TypeScript schema file for structured JSON output
- `systemPrompt` - Path to a markdown file with custom system prompt instructions
- `temperature` - Model temperature for response randomness (0 = deterministic, 2 = maximum creativity)
- `thinkingBudget` - Token budget for model thinking (0 = disabled, -1 = dynamic)
- `presets` - Named configurations that can be invoked with `--preset <name>`

The tool comes with `.chrome-geminirc.default.json` that provides sensible defaults. You can override any values by creating `.chrome-geminirc.json`.

### CLI Options

The CLI is intentionally minimal, prioritizing configuration files.

- `--preset <name>` - Use a named preset.
- `--help` - Show usage information.

### Using Presets

Presets allow you to create named configurations for common workflows. They are defined in the `presets` object for running automated tasks.

```bash
# Use the "quick" preset
npm start -- --preset quick "Find the price of an iPhone"

# Use the "research" preset
npm start -- --preset research "Discover the top 5 AI companies, and summarize the Wikipedia page of each company."
```

**Note:** Use `npm start --silent` to suppress all logs and get clean JSON output (perfect for piping/scripting).

## Schemas

Schema files for [structured output](https://ai.google.dev/gemini-api/docs/structured-output) must:

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

Add your own schemas in `schemas/` directory (git-ignored). See `schemas/examples/` for examples.
