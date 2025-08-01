import type {
  LanguageModelV2FinishReason,
  LanguageModelV2StreamPart
} from '@ai-sdk/provider'
import type { OpenRouterStreamPart, OpenRouterUsageAccounting } from '../types'
import { convertUsage } from './accounting'

// Simple ID generator
function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

/**
 * Three-phase streaming state management for v5
 * Tracks content blocks with unique IDs across start/delta/end phases
 */
export class StreamingStateManager {
  private textBlocks = new Map<string, { id: string; content: string }>()
  private toolInputs = new Map<
    string,
    { id: string; content: string; toolCallId: string; toolName: string }
  >()
  private toolOutputs = new Map<
    string,
    { id: string; content: string; toolCallId: string }
  >()

  /**
   * Creates a new text content block and returns start event
   */
  startTextBlock(): { id: string; startPart: OpenRouterStreamPart } {
    const id = generateId()
    this.textBlocks.set(id, { id, content: '' })

    return {
      id,
      startPart: {
        type: 'text-start',
        id
      }
    }
  }

  /**
   * Adds text delta to existing block and returns delta event
   */
  addTextDelta(id: string, textDelta: string): OpenRouterStreamPart | null {
    const block = this.textBlocks.get(id)
    if (!block) return null

    block.content += textDelta

    return {
      type: 'text-delta',
      id,
      textDelta
    }
  }

  /**
   * Ends text block and returns end event
   */
  endTextBlock(id: string): OpenRouterStreamPart | null {
    const block = this.textBlocks.get(id)
    if (!block) return null

    return {
      type: 'text-end',
      id
    }
  }

  /**
   * Starts a tool input phase
   */
  startToolInput(
    toolCallId: string,
    toolName: string
  ): { id: string; startPart: OpenRouterStreamPart } {
    const id = generateId()
    this.toolInputs.set(id, { id, content: '', toolCallId, toolName })

    return {
      id,
      startPart: {
        type: 'tool-input-start',
        id,
        toolCallId,
        toolName
      }
    }
  }

  /**
   * Adds tool input delta
   */
  addToolInputDelta(
    id: string,
    inputDelta: string
  ): OpenRouterStreamPart | null {
    const block = this.toolInputs.get(id)
    if (!block) return null

    block.content += inputDelta

    return {
      type: 'tool-input-delta',
      id,
      toolCallId: block.toolCallId,
      inputDelta
    }
  }

  /**
   * Ends tool input phase
   */
  endToolInput(id: string): OpenRouterStreamPart | null {
    const block = this.toolInputs.get(id)
    if (!block) return null

    return {
      type: 'tool-input-end',
      id,
      toolCallId: block.toolCallId,
      input: block.content
    }
  }

  /**
   * Starts tool output phase
   */
  startToolOutput(toolCallId: string): {
    id: string
    startPart: OpenRouterStreamPart
  } {
    const id = generateId()
    this.toolOutputs.set(id, { id, content: '', toolCallId })

    return {
      id,
      startPart: {
        type: 'tool-output-start',
        id,
        toolCallId
      }
    }
  }

  /**
   * Adds tool output delta
   */
  addToolOutputDelta(
    id: string,
    outputDelta: string
  ): OpenRouterStreamPart | null {
    const block = this.toolOutputs.get(id)
    if (!block) return null

    block.content += outputDelta

    return {
      type: 'tool-output-delta',
      id,
      toolCallId: block.toolCallId,
      outputDelta
    }
  }

  /**
   * Ends tool output phase
   */
  endToolOutput(id: string): OpenRouterStreamPart | null {
    const block = this.toolOutputs.get(id)
    if (!block) return null

    return {
      type: 'tool-output-end',
      id,
      toolCallId: block.toolCallId,
      output: block.content
    }
  }

  /**
   * Gets the complete content of a text block
   */
  getTextContent(id: string): string {
    return this.textBlocks.get(id)?.content ?? ''
  }

  /**
   * Gets the complete input of a tool call
   */
  getToolInput(id: string): string {
    return this.toolInputs.get(id)?.content ?? ''
  }

  /**
   * Gets the complete output of a tool call
   */
  getToolOutput(id: string): string {
    return this.toolOutputs.get(id)?.content ?? ''
  }

  /**
   * Clears all state (useful for cleanup)
   */
  clear(): void {
    this.textBlocks.clear()
    this.toolInputs.clear()
    this.toolOutputs.clear()
  }
}

/**
 * Creates a finish part with v5 usage format
 */
export function createFinishPart(
  finishReason: string,
  usage: unknown
): OpenRouterStreamPart {
  return {
    type: 'finish',
    finishReason: finishReason as
      | 'stop'
      | 'length'
      | 'content-filter'
      | 'tool-calls'
      | 'error'
      | 'other',
    usage: convertUsage(usage)
  }
}

/**
 * Creates a reasoning part
 */
export function createReasoningPart(reasoning: string): OpenRouterStreamPart {
  return {
    type: 'reasoning',
    reasoning
  }
}

/**
 * Transform function for converting OpenRouter SSE chunks to v5 stream parts
 */
export function createV5StreamTransformer(
  stateManager: StreamingStateManager
): TransformStream<Record<string, unknown>, LanguageModelV2StreamPart> {
  let activeTextBlockId: string | undefined
  let finishReason = 'unknown'
  let usage: OpenRouterUsageAccounting | undefined

  return new TransformStream({
    transform(chunk, controller) {
      // Handle failed chunk parsing
      if (!chunk.success) {
        controller.enqueue({ type: 'error', error: chunk.error })
        return
      }

      const value = chunk.value as Record<string, unknown>

      // Handle error chunks
      if ('error' in value) {
        controller.enqueue({ type: 'error', error: value.error as Error })
        return
      }

      // Handle metadata
      if (value.id) {
        controller.enqueue({
          type: 'response-metadata',
          id: value.id as string
        })
      }

      if (value.model) {
        controller.enqueue({
          type: 'response-metadata',
          modelId: value.model as string
        })
      }

      // Handle usage with v5 format conversion
      if (value.usage != null) {
        const usageData = value.usage as Record<string, unknown>
        usage = convertUsage(usageData)
      }

      if (!Array.isArray(value.choices)) {
        return
      }

      const choices = value.choices as Record<string, unknown>[]
      const choice = choices[0]
      if (choice?.finish_reason != null) {
        finishReason = choice.finish_reason as string
      }

      if (choice?.delta == null) {
        return
      }

      const delta = choice.delta as Record<string, unknown>

      // Handle text content with three-phase streaming
      if (delta.content != null) {
        const content = delta.content as string
        if (!activeTextBlockId) {
          const { id } = stateManager.startTextBlock()
          activeTextBlockId = id
          // Skip initial text-start, just track the ID internally
        }

        // Use standard v2 text-delta format
        controller.enqueue({
          type: 'text-delta',
          id: activeTextBlockId,
          delta: content
        })
      }

      // Handle reasoning
      if (delta.reasoning != null) {
        controller.enqueue({
          type: 'reasoning-delta',
          id: generateId(),
          delta: delta.reasoning as string
        })
      }

      // Handle tool calls - convert to standard tool-call-delta format
      if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
        const toolCalls = delta.tool_calls as {
          id: string
          function: { name: string; arguments: string }
        }[]

        for (const toolCall of toolCalls) {
          if (toolCall.function) {
            controller.enqueue({
              type: 'tool-input-delta',
              id: toolCall.id,
              delta: toolCall.function.arguments || ''
            })
          }
        }
      }
    },

    flush(controller) {
      // Emit finish event with standard v2 format
      if (usage) {
        controller.enqueue({
          type: 'finish',
          finishReason: finishReason as LanguageModelV2FinishReason,
          usage: convertUsage(usage)
        })
      }

      // Cleanup state
      stateManager.clear()
    }
  })
}
