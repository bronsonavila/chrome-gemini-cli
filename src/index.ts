#!/usr/bin/env node

import * as readline from 'readline'
import * as dotenv from 'dotenv'
import { resolveConfig, type UserConfig } from './config.js'
import { Orchestrator } from './orchestrator.js'
import { getTerminalWidth, parseCliArguments, printBox, printSeparator, validateEnvironmentVariable } from './utils.js'

// CONSTANTS

const IS_SILENT = process.env.npm_config_loglevel === 'silent'

const USAGE_TEXT = `
Chrome Gemini CLI - AI Browser Automation

An interactive CLI for browser automation powered by Gemini AI and Chrome DevTools.

Usage:
  npm start                                    Start interactive chat mode
  npm start -- "task description"              Execute a task, then enter chat mode
  npm start -- --preset <preset_name> "task"   Use a named preset from your config

Options:
  --preset <name>   Use a named preset from your config file
  --help, -h        Show this help message

Configuration:
  Default:          .chrome-geminirc.default.json (built-in defaults)
  Custom:           .chrome-geminirc.json (optional, overrides defaults)

Environment:
  GEMINI_API_KEY    Your Gemini API key (required)
                    Get one at: https://aistudio.google.com/apikey

Examples:
  npm start
  npm start -- "Find the price of the latest iPhone on Apple's website"
  npm start -- --preset quick "Search for React tutorials"
  npm start --silent -- --preset product-scrape "Get laptop prices" > output.json

Interactive Commands:
  exit, quit        Exit the program
  help              Show help message

Schema Example (schemas/examples/price-schema.ts):
  import { Type } from '@google/genai'

  export const priceSchema = {
    type: Type.OBJECT,
    properties: {
      price: { type: Type.STRING },
      currency: { type: Type.STRING },
      available: { type: Type.BOOLEAN }
    },
    required: ['price']
  }
`

// TYPES

interface ParsedConfig {
  apiKey: string
  initialTask?: string
  interactive: boolean
  maxSteps: number
  model: string
  requestDelayMs: number
  schema?: object
  schemaPath?: string
  temperature: number
  thinkingBudget: number
}

// INITIALIZATION

// Detect silent mode (npm --silent) and suppress all console output before dotenv config.
if (IS_SILENT) {
  console.log = () => {}
  console.error = () => {}
  console.warn = () => {}
  console.info = () => {}
}

dotenv.config()

// HELPER FUNCTIONS

/**
 * Create and configure the interactive readline session.
 */
function createInteractiveSession(orchestrator: Orchestrator): readline.Interface {
  const readlineInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'Prompt: '
  })

  readlineInterface.on('line', async (input: string) => {
    const trimmed = input.trim()

    if (!trimmed) return readlineInterface.prompt()

    if (trimmed === 'exit' || trimmed === 'quit') return console.log('\nGoodbye!'), readlineInterface.close()

    if (trimmed === 'help') return showUsage(), readlineInterface.prompt()

    try {
      handleResponse(await orchestrator.continueConversation(trimmed))
    } catch (error) {
      console.error('\nError:', (error as Error).message)

      if (process.env.DEBUG) console.error('Stack trace:', (error as Error).stack)
    }

    readlineInterface.prompt()
  })

  readlineInterface.on('close', async () => {
    await orchestrator.cleanup()

    process.exit(0)
  })

  process.on('SIGINT', () => (console.log('\n\nInterrupted. Cleaning up...'), readlineInterface.close()))

  return readlineInterface
}

/**
 * Display the application banner with configuration.
 */
function displayBanner(config: ParsedConfig): void {
  printSeparator()

  console.log('Chrome Gemini CLI - AI Browser Automation')

  printSeparator()

  console.log('Model:', config.model)
  console.log('Max Steps:', config.maxSteps)
  console.log(
    'Thinking Budget:',
    config.thinkingBudget === -1 ? 'Dynamic' : config.thinkingBudget === 0 ? 'Disabled' : config.thinkingBudget
  )

  if (config.schema) console.log('Response Schema: Enabled')

  printSeparator()
}

/**
 * Handle agent response.
 */
function handleResponse(response: object | string): void {
  const content = typeof response === 'string' ? response : JSON.stringify(response, null, 2)

  printBox('AGENT RESPONSE', content)
}

/**
 * Load and validate a TypeScript schema file.
 */
async function loadSchema(schemaPath: string): Promise<object> {
  try {
    const absolutePath = schemaPath.startsWith('/') ? schemaPath : `${process.cwd()}/${schemaPath}`
    const schemaModule = await import(absolutePath)

    const schema =
      schemaModule.default ||
      schemaModule.schema ||
      schemaModule[Object.keys(schemaModule).find(key => key.toLowerCase().includes('schema')) || '']

    if (!schema) throw new Error('No schema export found. Export your schema as default or name it "*schema"')

    return schema
  } catch (error) {
    throw new Error(`Failed to load schema from ${schemaPath}: ${(error as Error).message}`)
  }
}

/**
 * Display the usage/help text.
 */
function showUsage(): void {
  console.log(USAGE_TEXT)
}

/**
 * Validate and retrieve the Gemini API key from environment.
 */
function validateApiKey(): string {
  return validateEnvironmentVariable(
    'GEMINI_API_KEY',
    'GEMINI_API_KEY not set\n\n' +
      'Get an API key: https://aistudio.google.com/apikey\n' +
      'Create .env file and add: GEMINI_API_KEY=your_key_here'
  )
}

// MAIN EXECUTION

async function main(): Promise<void> {
  const { cliFlags, remainingArguments } = parseCliArguments(process.argv.slice(2))

  if (cliFlags.has('--help') || cliFlags.has('-h')) return showUsage(), void process.exit(0)

  try {
    // Build CLI config from flags.
    const cliConfig: UserConfig = {}

    // Resolve configuration from all sources.
    const resolvedConfig = resolveConfig({ cliConfig, presetName: cliFlags.get('--preset') })

    // Build final parsed config.
    const config: ParsedConfig = {
      apiKey: validateApiKey(),
      initialTask: remainingArguments.length > 0 ? remainingArguments.join(' ') : undefined,
      interactive: resolvedConfig.interactive,
      maxSteps: resolvedConfig.maxSteps,
      model: resolvedConfig.model,
      requestDelayMs: resolvedConfig.requestDelayMs,
      schema: resolvedConfig.schema ? await loadSchema(resolvedConfig.schema) : undefined,
      schemaPath: resolvedConfig.schema,
      temperature: resolvedConfig.temperature,
      thinkingBudget: resolvedConfig.thinkingBudget
    }

    if (config.schemaPath) console.log(`Loaded response schema from: ${config.schemaPath}`)

    displayBanner(config)

    const orchestrator = new Orchestrator(
      config.apiKey,
      config.schema,
      config.maxSteps,
      config.model,
      config.thinkingBudget,
      config.requestDelayMs,
      config.temperature,
      IS_SILENT
    )

    await orchestrator.connect()

    // Execute initial task if provided.
    if (config.initialTask) {
      console.log(`\nInitial Task: ${config.initialTask}`)

      const result = await orchestrator.executeTask(config.initialTask)

      // If non-interactive mode, exit after displaying result.
      if (!config.interactive) {
        // In silent mode, just write clean output directly.
        if (IS_SILENT) {
          const content = typeof result === 'string' ? result : JSON.stringify(result, null, 2)

          process.stdout.write(content + '\n')
        } else {
          // In verbose mode, display with box.
          handleResponse(result)
        }

        await orchestrator.cleanup()

        process.exit(0)
      }

      // Interactive mode: display with box.
      handleResponse(result)
    } else if (!config.interactive) {
      // --no-interactive requires an initial task.
      console.error('Error: --no-interactive requires a task to be provided')

      process.exit(1)
    }

    // Create readline interface for interactive mode.
    const readlineInterface = createInteractiveSession(orchestrator)

    console.log('\n' + '='.repeat(getTerminalWidth()))
    console.log('INTERACTIVE MODE')

    printSeparator()

    console.log('Type your prompt:')
    console.log('  - Enter a task for the AI to perform')
    console.log('  - Type "exit" or "quit" to exit')
    console.log('  - Type "help" for usage information')
    console.log('='.repeat(getTerminalWidth()) + '\n')

    readlineInterface.prompt()
  } catch (error) {
    printBox('ERROR', (error as Error).message, true)

    if (process.env.DEBUG) console.error('\nStack trace:', (error as Error).stack)

    process.exit(1)
  }
}

// ERROR HANDLERS

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught exception:', error.message)

  if (process.env.DEBUG) console.error(error.stack)

  process.exit(1)
})

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason)

  process.exit(1)
})

// BOOTSTRAP

main()
