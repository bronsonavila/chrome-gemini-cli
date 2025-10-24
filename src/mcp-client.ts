import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'

/**
 * MCP Client for Chrome DevTools automation.
 * Provides a simple interface to connect to MCP servers and call tools.
 */
export class MCPClient {
  private client: Client | null = null
  private connected: boolean = false
  private isSilent: boolean
  private transport: null | StdioClientTransport = null

  constructor(isSilent: boolean = false) {
    this.isSilent = isSilent
  }

  /**
   * Call any MCP tool by name with arguments.
   */
  async callTool(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    this.ensureConnected()

    try {
      console.log(`Calling tool: ${name}`)

      const result = await this.client!.callTool({ arguments: args, name })

      return result
    } catch (error) {
      console.error(`Failed to call tool ${name}:`, error)

      throw error
    }
  }

  /**
   * Gracefully close the connection and cleanup.
   */
  async close(): Promise<void> {
    if (this.connected && this.client) {
      try {
        console.log('Closing MCP connection...')

        await this.client.close()

        this.connected = false

        console.log('MCP connection closed')
      } catch (error) {
        console.error('Error closing MCP connection:', error)
      }
    }
  }

  /**
   * Initialize and connect to the chrome-devtools-mcp server.
   */
  async connect(): Promise<void> {
    try {
      console.log('Connecting to chrome-devtools-mcp server...')

      const transportOptions: { args: string[]; command: string; stderr?: 'ignore' | 'inherit' } = {
        args: ['chrome-devtools-mcp@latest'],
        command: 'npx',
        stderr: this.isSilent ? 'ignore' : 'inherit'
      }

      this.transport = new StdioClientTransport(transportOptions)

      this.client = new Client({ name: 'gemini-browser-client', version: '1.0.0' }, { capabilities: {} })

      await this.client.connect(this.transport)

      this.connected = true

      console.log('Successfully connected to chrome-devtools-mcp server')
    } catch (error) {
      console.error('Failed to connect to MCP server:', error)

      throw error
    }
  }

  /**
   * List all available MCP tools.
   */
  async listTools(): Promise<Tool[]> {
    this.ensureConnected()

    try {
      const { tools } = await this.client!.listTools()

      return tools
    } catch (error) {
      console.error('Failed to list tools:', error)

      throw error
    }
  }

  /**
   * Ensure the client is connected before operations.
   */
  private ensureConnected(): void {
    if (!this.connected) throw new Error('MCP client is not connected. Call connect() first.')
  }
}
