import type { LanguageModelV2CallOptions } from '@ai-sdk/provider'

// Message interfaces
export interface OpenRouterChatCompletionMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content:
    | string
    | {
        type: 'text' | 'image_url' | 'file'
        text?: string
        image_url?: { url: string }
        file?: { url: string; type: string; name: string }
      }[]
  name?: string
  tool_call_id?: string
  tool_calls?: {
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }[]
  reasoning_details?: {
    reasoning: string
  }
}

// Call options extending base with OpenRouter-specific options
export type OpenRouterCallOptions = LanguageModelV2CallOptions
