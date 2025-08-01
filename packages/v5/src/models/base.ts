import type {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2FinishReason,
  LanguageModelV2FunctionTool,
  LanguageModelV2ProviderDefinedTool,
  LanguageModelV2StreamPart
} from '@ai-sdk/provider'
import type { OpenRouterUsageAccounting } from '../types'

// Base interface for OpenRouter models implementing LanguageModelV2
export interface OpenRouterLanguageModelV2
  extends Omit<LanguageModelV2, 'doGenerate' | 'doStream'> {
  readonly specificationVersion: 'v2'
  readonly provider: string
  readonly modelId: string
  readonly defaultObjectGenerationMode: 'tool' | 'json'

  // Core generation method with v2 interfaces
  doGenerate(options: LanguageModelV2CallOptions): Promise<{
    content: {
      type: 'text' | 'reasoning' | 'tool-call'
      text?: string
      toolCallType?: 'function'
      toolCallId?: string
      toolName?: string
      input?: string
    }[]
    finishReason: LanguageModelV2FinishReason
    usage: OpenRouterUsageAccounting
    request?: { body?: unknown }
    response?: {
      id?: string
      modelId?: string
      headers?: Record<string, string>
    }
    warnings: unknown[]
  }>

  // Core streaming method with v2 interfaces
  doStream(options: LanguageModelV2CallOptions): Promise<{
    stream: ReadableStream<LanguageModelV2StreamPart>
    request?: { body?: unknown }
    response?: { headers?: Record<string, string> }
    warnings: unknown[]
  }>
}

// Base configuration interface for OpenRouter models
export interface OpenRouterModelConfig {
  provider: string
  compatibility: 'strict' | 'compatible'
  headers: () => Record<string, string | undefined>
  url: (options: { modelId: string; path: string }) => string
  fetch?: typeof fetch
  extraBody?: Record<string, unknown>
}

// Utility function to check if tool is a function tool
export function isFunctionTool(
  tool: LanguageModelV2FunctionTool | LanguageModelV2ProviderDefinedTool
): tool is LanguageModelV2FunctionTool {
  return 'inputSchema' in tool // Updated from 'parameters' to 'inputSchema' in v5
}

// Utility function to validate required usage properties in v5
export function validateUsageAccounting(
  usage: unknown
): OpenRouterUsageAccounting {
  if (!usage || typeof usage !== 'object') {
    throw new Error('Usage accounting is required in v5')
  }

  const usageObj = usage as Record<string, unknown>

  // Check for v4 property names and convert if needed
  const inputTokens = usageObj.inputTokens ?? usageObj.promptTokens
  const outputTokens = usageObj.outputTokens ?? usageObj.completionTokens
  const totalTokens =
    usageObj.totalTokens ??
    (typeof inputTokens === 'number' && typeof outputTokens === 'number'
      ? inputTokens + outputTokens
      : undefined)

  if (typeof inputTokens !== 'number' || typeof outputTokens !== 'number') {
    throw new Error('inputTokens and outputTokens are required in v5')
  }

  return {
    inputTokens,
    outputTokens,
    totalTokens:
      typeof totalTokens === 'number'
        ? totalTokens
        : inputTokens + outputTokens,
    inputTokensDetails: (usageObj.inputTokensDetails ??
      usageObj.promptTokensDetails) as Record<string, unknown> | undefined,
    outputTokensDetails: (usageObj.outputTokensDetails ??
      usageObj.completionTokensDetails) as Record<string, unknown> | undefined,
    cost: usageObj.cost as number | undefined
  }
}

// Utility function to convert tool calls to current format
export function convertToolCalls(toolCalls: unknown[]): {
  toolCallId: string
  toolName: string
  input: string
}[] {
  return toolCalls.map((call) => {
    const callObj = call as Record<string, unknown>
    return {
      toolCallId: callObj.toolCallId as string,
      toolName: callObj.toolName as string,
      input: (callObj.input ?? callObj.args ?? '{}') as string
    }
  })
}
