import type { OpenRouterToolCall } from '../../types'

/**
 * Builder for creating tool calls with fluent interface
 */
export class ToolCallBuilder {
  private toolCallId: string
  private toolName: string
  private input = ''

  constructor(toolCallId: string, toolName: string) {
    this.toolCallId = toolCallId
    this.toolName = toolName
  }

  /**
   * Sets the input as a string
   */
  setInput(input: string): ToolCallBuilder {
    this.input = input
    return this
  }

  /**
   * Sets the input as an object (will be JSON stringified)
   */
  setInputObject(inputObject: Record<string, unknown>): ToolCallBuilder {
    this.input = JSON.stringify(inputObject)
    return this
  }

  /**
   * Builds the final tool call
   */
  build(): OpenRouterToolCall {
    return {
      toolCallId: this.toolCallId,
      toolName: this.toolName,
      input: this.input
    }
  }
}
