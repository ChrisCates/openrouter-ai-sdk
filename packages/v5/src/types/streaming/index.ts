import type { LanguageModelV2StreamPart } from '@ai-sdk/provider'
import type { OpenRouterUsageAccounting } from '../usage'

// Enhanced streaming parts for three-phase architecture
export interface OpenRouterTextStartPart {
  type: 'text-start'
  id: string
}

export interface OpenRouterTextDeltaPart {
  type: 'text-delta'
  id: string
  textDelta: string
}

export interface OpenRouterTextEndPart {
  type: 'text-end'
  id: string
}

export interface OpenRouterToolInputStartPart {
  type: 'tool-input-start'
  id: string
  toolCallId: string
  toolName: string
}

export interface OpenRouterToolInputDeltaPart {
  type: 'tool-input-delta'
  id: string
  toolCallId: string
  inputDelta: string
}

export interface OpenRouterToolInputEndPart {
  type: 'tool-input-end'
  id: string
  toolCallId: string
  input: string
}

export interface OpenRouterToolOutputStartPart {
  type: 'tool-output-start'
  id: string
  toolCallId: string
}

export interface OpenRouterToolOutputDeltaPart {
  type: 'tool-output-delta'
  id: string
  toolCallId: string
  outputDelta: string
}

export interface OpenRouterToolOutputEndPart {
  type: 'tool-output-end'
  id: string
  toolCallId: string
  output: string
}

export interface OpenRouterReasoningPart {
  type: 'reasoning'
  reasoning: string
}

export interface OpenRouterFinishPart {
  type: 'finish'
  finishReason:
    | 'stop'
    | 'length'
    | 'content-filter'
    | 'tool-calls'
    | 'error'
    | 'other'
  usage: OpenRouterUsageAccounting
}

// Union type for all streaming parts
export type OpenRouterStreamPart =
  | OpenRouterTextStartPart
  | OpenRouterTextDeltaPart
  | OpenRouterTextEndPart
  | OpenRouterToolInputStartPart
  | OpenRouterToolInputDeltaPart
  | OpenRouterToolInputEndPart
  | OpenRouterToolOutputStartPart
  | OpenRouterToolOutputDeltaPart
  | OpenRouterToolOutputEndPart
  | OpenRouterReasoningPart
  | OpenRouterFinishPart
  | LanguageModelV2StreamPart
