import type { JSONValue } from '@ai-sdk/provider'

// Provider options (renamed from providerMetadata)
export interface OpenRouterProviderOptions {
  openrouter?: Record<string, JSONValue>
  [key: string]: Record<string, JSONValue> | undefined
}

// Updated shared settings
export interface OpenRouterSharedSettings {
  apiKey?: string
  baseURL?: string
  headers?: Record<string, string>
  user?: string
  temperature?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  seed?: number
  maxTokens?: number
  providerOptions?: OpenRouterProviderOptions // renamed from providerMetadata
}

// Chat-specific settings
export interface OpenRouterChatSettings extends OpenRouterSharedSettings {
  logitBias?: Record<string, number>
  logprobs?: boolean
  topLogprobs?: number
  parallelToolCalls?: boolean
  includeReasoning?: boolean
  reasoning?: {
    effort?: 'low' | 'medium' | 'high'
    max_tokens?: number
    enabled?: boolean
    exclude?: boolean
  }
  usage?: boolean
  extraBody?: Record<string, unknown>
}

// Completion-specific settings
export interface OpenRouterCompletionSettings extends OpenRouterSharedSettings {
  logitBias?: Record<string, number>
  logprobs?: number
  suffix?: string
  extraBody?: Record<string, unknown>
  includeReasoning?: boolean
  reasoning?: {
    effort?: 'low' | 'medium' | 'high'
    max_tokens?: number
    enabled?: boolean
    exclude?: boolean
  }
}
