import type { ReasoningDetailUnion } from '../schemas/reasoning'
import type { OpenRouterCacheControl } from '../utils/convert/chat.messages'

export interface ChatCompletionContentPartText {
  type: 'text'
  text: string
  cache_control?: OpenRouterCacheControl
}

export interface ChatCompletionContentPartImage {
  type: 'image_url'
  image_url: {
    url: string
    detail?: 'auto' | 'low' | 'high'
  }
  cache_control?: OpenRouterCacheControl
}

export interface ChatCompletionContentPartFile {
  type: 'file'
  file: {
    filename: string
    file_data: string
  }
  cache_control?: OpenRouterCacheControl
}

export type ChatCompletionContentPart =
  | ChatCompletionContentPartText
  | ChatCompletionContentPartImage
  | ChatCompletionContentPartFile

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | ChatCompletionContentPart[]
  name?: string
  tool_calls?: {
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }[]
  tool_call_id?: string
  reasoning?: string
  reasoning_details?: ReasoningDetailUnion[]
  cache_control?: OpenRouterCacheControl
}

export type OpenRouterChatCompletionsInput = ChatCompletionMessage[]
