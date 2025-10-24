# Chrome Gemini CLI

Agentic CLI for AI-powered browser automation. Tell the agent what you want, and it autonomously navigates, clicks, fills forms, and extracts data.

Built with **Gemini AI** and **Chrome DevTools MCP**.

<img src="assets/demo.gif" alt="Demo of the Person-to-Address Search Verifier in action" width="830" />

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

Starts a new chat session using your default configuration from `.chrome-geminirc.json`.

```bash
npm start
```

**Run a Task:**

Executes a one-off task with your default settings.

```bash
npm start -- "Find Honolulu's weather on Google"
```

**Using a Preset:**

Executes a task using a named preset from your config file. This is the primary way to run configured, non-interactive, or schema-driven tasks.

```bash
# This example assumes a "product-scrape" preset exists in your config
# that sets a schema and disables interactive mode.
npm start -- --preset product-scrape "Get the top 3 laptops from Best Buy"
```

**Scripting (Quiet Mode):**

For clean JSON output suitable for piping or redirecting to a file, use `npm start --silent`.

```bash
# Using a preset and piping the clean JSON output to a file
npm start --silent -- --preset product-scrape "Get the top 3 laptops" > output/laptops.json
```

**Important:** When redirecting output (`>`) or piping (`|`), always use `npm start --silent` to prevent progress logs from being included in your output file or pipeline.

## Configuration

Chrome Gemini CLI uses an opinionated configuration system where the config file is the single source of truth for all non-secret settings.

Configuration is resolved in the following order (highest to lowest priority):

1.  **CLI Flags** - For temporary, one-time overrides (presets only).
2.  **Project Config** - `.chrome-geminirc.json` in the current directory (optional, overrides defaults).
3.  **Default Config** - `.chrome-geminirc.default.json` (built-in, always present).

### Environment Variables (`.env` file)

Environment variables are used **strictly for secrets**. All other configuration (model, steps, etc.) belongs in a config file.

```env
# .env
GEMINI_API_KEY=your_key_here
```

### Configuration Files (Primary Method)

This is the standard and recommended way to configure the CLI.

**Project Config (`.chrome-geminirc.json`):**

Create this file in your project's root directory. It becomes the single source of truth for how the tool should behave for that project.

```json
{
  "interactive": true,
  "maxSteps": 30,
  "model": "gemini-2.5-flash",
  "requestDelayMs": 500,
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
- `temperature` - Model temperature for response randomness (0 = deterministic, 2 = maximum creativity)
- `thinkingBudget` - Token budget for model thinking (0 = disabled, -1 = dynamic)
- `presets` - Named configurations that can be invoked with `--preset <name>`

The tool comes with a `.chrome-geminirc.default.json` file that provides sensible defaults. You can override any of these values by creating your own `.chrome-geminirc.json` file.

### CLI Options

The CLI is intentionally minimal, prioritizing configuration files.

- `--preset <name>` - Use a named preset from your config file.
- `--help` - Show usage information.

### Using Presets

Presets allow you to create named configurations for common workflows. They are defined in the `presets` object in your config file. This is the primary way to run different types of automated tasks.

```bash
# Use the "quick" preset from your config file
npm start -- --preset quick "Find the price of an iPhone"

# Use the "research" preset from your config file
npm start -- --preset research "Discover the top 5 AI companies, and summarize the Wikipedia page of each company."
```

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
