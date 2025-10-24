import { FunctionCall } from '@google/genai'
import { GeminiClient } from './gemini-client.js'
import { MCPClient } from './mcp-client.js'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'

interface MCPResultContentItem {
  text?: string
  type: string
}

interface MCPToolResult {
  content?: MCPResultContentItem[]
}

/**
 * Orchestrator that coordinates agentic browser automation with Gemini AI.
 */
export class Orchestrator {
  private availableTools: Tool[] = []
  private currentQuery: string = ''
  private geminiClient: GeminiClient
  private isConnected: boolean = false
  private maxSteps: number
  private mcpClient: MCPClient

  constructor(
    geminiApiKey: string,
    responseSchema: object | undefined,
    maxSteps: number,
    model: string,
    thinkingBudget: number,
    requestDelayMs: number,
    temperature: number,
    isSilent: boolean = false
  ) {
    this.mcpClient = new MCPClient(isSilent)
    this.geminiClient = new GeminiClient(
      geminiApiKey,
      responseSchema,
      model,
      thinkingBudget,
      requestDelayMs,
      temperature
    )
    this.maxSteps = maxSteps
  }

  /**
   * Cleanup resources.
   */
  async cleanup(): Promise<void> {
    console.log('\n=== CLEANUP ===')

    await this.mcpClient.close()

    this.geminiClient.reset()

    this.isConnected = false
  }

  /**
   * Initialize the connection to the MCP server.
   */
  async connect(): Promise<void> {
    if (this.isConnected) return

    console.log('\n=== INITIALIZING ===')

    await this.mcpClient.connect()

    console.log('\n=== LOADING AVAILABLE TOOLS ===')

    this.availableTools = await this.mcpClient.listTools()

    console.log(`Loaded ${this.availableTools.length} tools from Chrome DevTools MCP`)

    this.isConnected = true
  }

  /**
   * Continue the conversation with a new user message.
   */
  async continueConversation(userMessage: string): Promise<object | string> {
    if (!this.isConnected) throw new Error('Orchestrator not connected. Call connect() first.')

    this.currentQuery = userMessage

    let agentResponse = await this.geminiClient.addUserMessage(userMessage, this.availableTools)
    let steps = 0

    // Agentic loop.
    while (agentResponse.type === 'function_call' && steps < this.maxSteps) {
      steps++

      const functionCalls = agentResponse.functionCalls || []

      console.log(`\n=== STEP ${steps}/${this.maxSteps} ===`)

      if (agentResponse.thinking) console.log(`Agent thinking: ${agentResponse.thinking}`)

      const toolResults = await this.executeFunctionCalls(functionCalls)

      agentResponse = await this.geminiClient.continueAgent(this.availableTools, toolResults)
    }

    if (agentResponse.type === 'answer' && agentResponse.answer) {
      return agentResponse.answer
    } else {
      console.log('\n=== MAX STEPS REACHED ===')

      return 'Maximum steps reached. Task incomplete.'
    }
  }

  /**
   * Execute a task: start the agent with a user query.
   */
  async executeTask(userQuery: string): Promise<object | string> {
    if (!this.isConnected) throw new Error('Orchestrator not connected. Call connect() first.')

    this.currentQuery = userQuery

    let agentResponse = await this.geminiClient.startAgent(userQuery, this.availableTools)
    let steps = 0

    // Agentic loop.
    while (agentResponse.type === 'function_call' && steps < this.maxSteps) {
      steps++

      const functionCalls = agentResponse.functionCalls || []

      console.log(`\n=== STEP ${steps}/${this.maxSteps} ===`)

      if (agentResponse.thinking) console.log(`Agent thinking: ${agentResponse.thinking}`)

      // Execute all function calls Gemini requested.
      const toolResults = await this.executeFunctionCalls(functionCalls)

      // Feed results back to Gemini and get next action.
      agentResponse = await this.geminiClient.continueAgent(this.availableTools, toolResults)
    }

    // Process final answer.
    if (agentResponse.type === 'answer' && agentResponse.answer) {
      return agentResponse.answer
    } else {
      console.log('\n=== MAX STEPS REACHED ===')

      return 'Maximum steps reached. Task incomplete.'
    }
  }

  /**
   * Execute the function calls that Gemini requested.
   */
  private async executeFunctionCalls(
    functionCalls: FunctionCall[]
  ): Promise<Array<{ result: string; toolName: string }>> {
    const results: Array<{ result: string; toolName: string }> = []

    for (const functionCall of functionCalls) {
      const toolName = functionCall.name
      const args = functionCall.args || {}

      console.log(`\n→ Calling tool: ${toolName}`)
      console.log(`  Arguments: ${JSON.stringify(args, null, 2)}`)

      try {
        if (typeof toolName !== 'string') throw new Error('Tool name is not a string')

        // Intercept navigate_page calls to google.com without query parameters and fix them.
        // This is necessary because the `fill` command does not work reliably on the Google search homepage.
        if (toolName === 'navigate_page' && args.url) {
          const url = String(args.url).toLowerCase()

          if (
            (url === 'https://www.google.com' ||
              url === 'https://google.com' ||
              url === 'http://www.google.com' ||
              url === 'http://google.com' ||
              url === 'www.google.com' ||
              url === 'google.com') &&
            !url.includes('?')
          ) {
            // Automatically fix the URL by appending the search query.
            const searchQuery = this.currentQuery.replace(/\s+/g, '+')

            args.url = `https://www.google.com/search?q=${searchQuery}`
          }
        }

        const result = await this.mcpClient.callTool(toolName, args)
        const resultString = this.formatToolResult(result)

        console.log(`✓ Tool completed`)
        console.log(`  Result preview: ${resultString.substring(0, 200)}${resultString.length > 200 ? '...' : ''}`)

        results.push({ result: String(resultString), toolName: String(toolName) })
      } catch (error) {
        const errorMessage = `Error: ${(error as Error).message}`

        console.error(`✗ Tool failed: ${errorMessage}`)

        results.push({ result: String(errorMessage), toolName: String(toolName) })
      }
    }

    return results
  }

  /**
   * Format tool result into a string for Gemini to understand.
   */
  private formatToolResult(result: unknown): string {
    if (typeof result === 'string') return result

    if (typeof result === 'object' && result !== null) {
      const resultObject = result as MCPToolResult

      // Handle MCP tool results with content array.
      if (resultObject.content && Array.isArray(resultObject.content)) {
        return resultObject.content
          .map((item: MCPResultContentItem) => {
            if (item.type === 'text') return item.text || ''

            if (item.type === 'image') return '[Image content not shown to agent]'

            return JSON.stringify(item)
          })
          .join('\n')
      }

      // Otherwise just stringify.
      return JSON.stringify(result, null, 2)
    }

    return String(result)
  }
}
