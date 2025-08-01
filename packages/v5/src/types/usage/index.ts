// Updated usage accounting with current property names
export interface OpenRouterUsageAccounting {
  inputTokens: number // renamed from promptTokens
  outputTokens: number // renamed from completionTokens
  totalTokens: number // now required
  inputTokensDetails?: Record<string, unknown>
  outputTokensDetails?: Record<string, unknown>
  cost?: number
}
