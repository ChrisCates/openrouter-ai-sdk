import type { OpenRouterToolCall } from '../../types'

/**
 * Converts v4 tool call format to current format
 * Handles property renaming: args -> input
 */
export function convertToolCall(toolCall: unknown): OpenRouterToolCall {
  if (!toolCall || typeof toolCall !== 'object') {
    throw new Error('Tool call is required')
  }

  const toolCallObj = toolCall as Record<string, unknown>

  // Handle both v4 and current property names for backward compatibility
  const input =
    toolCallObj.input ?? toolCallObj.args ?? toolCallObj.arguments ?? ''

  if (!toolCallObj.toolCallId) {
    throw new Error('Tool call must have a toolCallId')
  }

  if (!toolCallObj.toolName) {
    throw new Error('Tool call must have a toolName')
  }

  return {
    toolCallId: toolCallObj.toolCallId as string,
    toolName: toolCallObj.toolName as string,
    input: typeof input === 'string' ? input : JSON.stringify(input)
  }
}

/**
 * Converts an array of v4 tool calls to current format
 */
export function convertToolCalls(toolCalls: unknown[]): OpenRouterToolCall[] {
  if (!Array.isArray(toolCalls)) {
    return []
  }

  return toolCalls.map(convertToolCall)
}

/**
 * Converts OpenRouter API tool call format to current format
 */
export function convertAPIToolCall(apiToolCall: unknown): OpenRouterToolCall {
  if (!apiToolCall || typeof apiToolCall !== 'object') {
    throw new Error('API tool call is required')
  }

  const apiToolCallObj = apiToolCall as Record<string, unknown>

  if (apiToolCallObj.function && typeof apiToolCallObj.function === 'object') {
    const functionObj = apiToolCallObj.function as Record<string, unknown>
    return createToolCall(
      apiToolCallObj.id as string,
      functionObj.name as string,
      (functionObj.arguments as string) || '{}'
    )
  }

  // Handle direct format
  return convertToolCall(apiToolCall)
}

/**
 * Converts current tool call back to OpenRouter API format
 */
export function convertToolCallToAPI(
  toolCall: OpenRouterToolCall
): Record<string, unknown> {
  return {
    id: toolCall.toolCallId,
    type: 'function',
    function: {
      name: toolCall.toolName,
      arguments: toolCall.input
    }
  }
}

/**
 * Creates a tool call in current format
 */
export function createToolCall(
  toolCallId: string,
  toolName: string,
  input?: string | object
): OpenRouterToolCall {
  const inputString =
    input === undefined
      ? ''
      : typeof input === 'string'
        ? input
        : JSON.stringify(input)

  const toolCall: OpenRouterToolCall = {
    toolCallId,
    toolName,
    input: inputString
  }

  validateToolCall(toolCall)
  return toolCall
}

/**
 * Validates that a tool call follows current format
 */
export function validateToolCall(toolCall: OpenRouterToolCall): void {
  if (typeof toolCall.toolCallId !== 'string' || !toolCall.toolCallId) {
    throw new Error('toolCallId must be a non-empty string')
  }

  if (typeof toolCall.toolName !== 'string' || !toolCall.toolName) {
    throw new Error('toolName must be a non-empty string')
  }

  if (typeof toolCall.input !== 'string') {
    throw new Error('input must be a string (renamed from args in v4)')
  }

  // Validate that input is valid JSON if it should be
  try {
    JSON.parse(toolCall.input)
  } catch {
    // Input doesn't need to be valid JSON, but if it's meant to be JSON
    // and isn't valid, that might indicate an issue
    console.warn(
      `Tool call input for ${toolCall.toolName} may not be valid JSON:`,
      toolCall.input
    )
  }
}
