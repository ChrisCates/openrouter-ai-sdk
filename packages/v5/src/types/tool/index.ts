// Updated tool call interface with current property names
export interface OpenRouterToolCall {
  toolCallId: string
  toolName: string
  input: string // renamed from args
}
