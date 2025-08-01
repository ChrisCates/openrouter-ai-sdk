// Core types and interfaces
export type {
  OpenRouterCallOptions,
  OpenRouterChatCompletionMessage,
  OpenRouterChatSettings,
  OpenRouterCompletionSettings,
  OpenRouterFinishPart,
  OpenRouterProviderOptions,
  OpenRouterReasoningPart,
  OpenRouterSharedSettings,
  OpenRouterStreamPart,
  OpenRouterTextDeltaPart,
  OpenRouterTextEndPart,
  OpenRouterTextStartPart,
  OpenRouterToolCall,
  OpenRouterToolInputDeltaPart,
  OpenRouterToolInputEndPart,
  OpenRouterToolInputStartPart,
  OpenRouterToolOutputDeltaPart,
  OpenRouterToolOutputEndPart,
  OpenRouterToolOutputStartPart,
  OpenRouterUsageAccounting
} from './types'

// Base model interfaces
export type {
  OpenRouterLanguageModelV2,
  OpenRouterModelConfig
} from './models/base'
export {
  convertToolCalls as convertModelToolCalls,
  isFunctionTool,
  validateUsageAccounting
} from './models/base'

// Chat model
export { OpenRouterChatLanguageModel } from './models/chat'

// Completion model
export { OpenRouterCompletionLanguageModel } from './models/completion'

// Usage accounting utilities
export {
  addUsage,
  convertUsage,
  createDefaultUsage,
  validateUsage
} from './utils/accounting'

// Tool calling utilities
export {
  convertAPIToolCall,
  convertToolCall,
  convertToolCalls,
  convertToolCallToAPI,
  createToolCall,
  parseToolCallInput,
  ToolCallBuilder,
  validateToolCall
} from './utils/tool'

// Streaming utilities
export {
  createFinishPart,
  createReasoningPart,
  createV5StreamTransformer,
  StreamingStateManager
} from './utils/streaming'

// Provider options utilities
export {
  convertProviderMetadata,
  createDefaultProviderOptions,
  extractOpenRouterOptions,
  mergeProviderOptions,
  providerOptionsToHeaders,
  validateProviderOptions
} from './utils/provider'

// Error handling
export type { OpenRouterErrorData } from './error'
export {
  OpenRouterErrorResponseSchema,
  openrouterFailedResponseHandler,
  validateErrorResponse
} from './error'

// Schemas
export type {
  ReasoningContentPart,
  ReasoningDetailEncrypted,
  ReasoningDetailSummary,
  ReasoningDetailText,
  ReasoningDetailUnion
} from './schemas'
export {
  createReasoningContentPart,
  ReasoningContentPartSchema,
  ReasoningDetailArraySchema,
  ReasoningDetailEncryptedSchema,
  ReasoningDetailSummarySchema,
  ReasoningDetailTextSchema,
  ReasoningDetailType,
  ReasoningDetailUnionSchema,
  validateReasoningDetails
} from './schemas'

// Provider exports - convenience functions
export type {
  OpenRouterModelId,
  OpenRouterProvider,
  OpenRouterProviderSettings
} from './provider'
export { createOpenRouter, openrouter } from './provider'

// Re-export essential types from AI SDK for convenience
export type {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2FinishReason,
  LanguageModelV2FunctionTool,
  LanguageModelV2Prompt,
  LanguageModelV2ProviderDefinedTool,
  LanguageModelV2StreamPart
} from '@ai-sdk/provider'

/**
 * OpenRouter AI SDK v5
 *
 * This package provides the core infrastructure for implementing OpenRouter
 * language models that are compatible with AI SDK v5 beta.
 *
 * Key features:
 * - LanguageModelV2 interface compliance
 * - Three-phase streaming architecture (start/delta/end)
 * - Updated token usage properties (inputTokens/outputTokens)
 * - Tool calling with 'input' property (renamed from 'args')
 * - Provider options handling (renamed from 'providerMetadata')
 * - Comprehensive TypeScript type safety
 *
 * @version 5.0.0
 * @compatibility AI SDK v5 beta
 */

// Version information
export const VERSION = '5.0.0'
export const SPECIFICATION_VERSION = 'v2'
export const COMPATIBILITY = 'ai-sdk-v5-beta'

// Default configuration
export const DEFAULT_CONFIG = {
  provider: 'openrouter',
  compatibility: 'strict' as const,
  specificationVersion: 'v2' as const
}
