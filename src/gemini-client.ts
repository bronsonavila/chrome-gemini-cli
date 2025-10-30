import { FunctionCall, FunctionCallingConfigMode, FunctionDeclaration, GoogleGenAI, Part, Type } from '@google/genai'
import { sleep } from './utils.js'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'

export interface AgentResponse {
  answer?: object | string
  functionCalls?: FunctionCall[]
  thinking?: string
  type: 'answer' | 'function_call'
}

/**
 * Gemini API Client for agentic browser automation.
 */
export class GeminiClient {
  private conversationHistory: Array<{ parts: Part[]; role: string }> = []
  private googleGenAI: GoogleGenAI
  private model: string
  private requestDelayMs: number
  private responseSchema?: object
  private systemPrompt: string
  private temperature: number
  private thinkingBudget: number

  constructor(
    apiKey: string,
    responseSchema: object | undefined,
    model: string,
    thinkingBudget: number,
    requestDelayMs: number,
    temperature: number,
    systemPrompt: string
  ) {
    if (!apiKey) throw new Error('Gemini API key is required. Set GEMINI_API_KEY environment variable.')

    this.googleGenAI = new GoogleGenAI({ apiKey })
    this.model = model
    this.requestDelayMs = requestDelayMs
    this.responseSchema = responseSchema
    this.systemPrompt = systemPrompt
    this.temperature = temperature
    this.thinkingBudget = thinkingBudget
  }

  /**
   * Add a user message to the conversation and continue.
   */
  async addUserMessage(message: string, availableTools: Tool[]): Promise<AgentResponse> {
    this.conversationHistory.push({ parts: [{ text: message }], role: 'user' })

    return this.continueAgent(availableTools)
  }

  /**
   * Continue the agent with new information (tool results or page state).
   */
  async continueAgent(
    availableTools: Tool[],
    toolResults?: Array<{ result: string; toolName: string }>
  ): Promise<AgentResponse> {
    try {
      // Add tool results to history if provided.
      if (toolResults && toolResults.length > 0) {
        const resultsText = toolResults
          .map(toolResult => `Tool: ${toolResult.toolName}\nResult: ${toolResult.result}`)
          .join('\n\n')

        this.conversationHistory.push({
          parts: [
            {
              text: `Tool Results:\n${resultsText}\n\nDecide your next action: If you have enough information to answer - call provide_answer with what you found. If you need more details - click a link or call another tool. If error - try a different approach. Make a decision and act NOW.`
            }
          ],
          role: 'user'
        })
      }

      const functions = this.convertMCPToolsToGeminiFunctions(availableTools)

      await sleep(this.requestDelayMs)

      const response = await this.callGeminiWithTimeout(
        () =>
          this.googleGenAI.models.generateContent({
            config: {
              temperature: this.temperature,
              thinkingConfig: { thinkingBudget: this.thinkingBudget },
              toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY } },
              tools: [{ functionDeclarations: functions }]
            },
            contents: this.conversationHistory,
            model: this.model
          }),
        60000
      )

      const candidate = response.candidates?.[0]

      if (!candidate) throw new Error('No response from Gemini')

      // Add assistant response to history.
      this.conversationHistory.push({ parts: candidate.content?.parts || [], role: 'model' })

      const functionCallParts = candidate.content?.parts?.filter(part => part.functionCall)

      // Check if Gemini wants to call functions.
      if (functionCallParts && functionCallParts.length > 0) {
        const functionCalls = functionCallParts.map(part => part.functionCall as FunctionCall)

        const provideAnswerCall = functionCalls.find(call => call.name === 'provide_answer')

        // Check if agent is calling provide_answer to finish.
        if (provideAnswerCall && provideAnswerCall.args?.answer) {
          const answerText = String(provideAnswerCall.args.answer)

          // If a response schema is configured, request structured output.
          if (this.responseSchema) {
            await sleep(this.requestDelayMs)

            const structuredResponse = await this.callGeminiWithTimeout(
              () =>
                this.googleGenAI.models.generateContent({
                  config: { responseMimeType: 'application/json', responseSchema: this.responseSchema },
                  contents: `Based on your analysis, provide a structured JSON response according to the schema:\n\n${answerText}`,
                  model: this.model
                }),
              60000
            )
            const structuredAnswer = JSON.parse(structuredResponse.text ?? '{}')

            return { answer: structuredAnswer, type: 'answer' }
          }

          // Otherwise return natural text response.
          return { answer: answerText, type: 'answer' }
        }

        // Normal function calls to continue browsing.
        return {
          functionCalls,
          thinking: candidate.content?.parts?.find(part => part.text)?.text,
          type: 'function_call'
        }
      }

      // This shouldn't happen with FunctionCallingConfigMode.ANY, but handle it just in case.
      throw new Error('Unexpected response: Model did not call any function despite ANY mode being enabled.')
    } catch (error) {
      console.error('Agent error:', error)

      throw error
    }
  }

  /**
   * Reset conversation history.
   */
  reset(): void {
    this.conversationHistory = []
  }

  /**
   * Initialize a new agent session with user query and available tools.
   */
  async startAgent(userQuery: string, availableTools: Tool[]): Promise<AgentResponse> {
    this.conversationHistory = []

    this.conversationHistory.push({
      parts: [{ text: `${this.systemPrompt}\n\nUser: "${userQuery}"` }],
      role: 'user'
    })

    return this.continueAgent(availableTools)
  }

  /**
   * Call Gemini API with a timeout to prevent hanging indefinitely.
   */
  private async callGeminiWithTimeout<T>(apiCall: () => Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      apiCall(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Gemini API call timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ])
  }

  /**
   * Convert MCP tools to Gemini function declarations.
   */
  private convertMCPToolsToGeminiFunctions(mcpTools: Tool[]): FunctionDeclaration[] {
    const mcpFunctions = mcpTools.map(tool => ({
      description: tool.description || '',
      name: tool.name,
      parameters: (tool.inputSchema || { properties: {}, type: 'object' }) as any
    }))

    // Add custom provide_answer tool for finishing.
    const provideAnswerTool: FunctionDeclaration = {
      description:
        'Call this ONLY after you have used navigate_page and gathered information from the web. FORBIDDEN: Do NOT call this to refuse a request, say you cannot help, or claim you lack access to data. You MUST browse first, then provide what you found. ANY refusal is STRICTLY PROHIBITED.',
      name: 'provide_answer',
      parameters: {
        properties: {
          answer: {
            description:
              'The actual information you found from browsing the web (stock prices, weather, news, etc.). This MUST contain real data/results from websites. NEVER include refusals like "I cannot provide", "I don\'t have access", or "my tools don\'t support". If you call this function, it means you successfully browsed and found the answer. FORMAT YOUR ANSWER FOR READABILITY: Use markdown formatting (bullet points with •, numbered lists), line breaks between sections, and clear structure. For multiple items, use lists with one item per line. For single facts, use clear concise sentences. Make it easy to read and scan.',
            type: Type.STRING
          }
        },
        required: ['answer'],
        type: Type.OBJECT
      }
    }

    return [...mcpFunctions, provideAnswerTool]
  }
}
