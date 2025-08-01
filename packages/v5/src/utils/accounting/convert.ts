import type { OpenRouterUsageAccounting } from '../../types'

/**
 * Converts v4 usage accounting format to current format
 * Handles property renaming: promptTokens -> inputTokens, completionTokens -> outputTokens
 */
export function convertUsage(usage: unknown): OpenRouterUsageAccounting {
  if (!usage || typeof usage !== 'object') {
    throw new Error('Usage accounting is required')
  }

  const usageObj = usage as Record<string, unknown>

  // Handle both v4 and current property names for backward compatibility
  const inputTokens = (usageObj.inputTokens ??
    usageObj.promptTokens ??
    usageObj.prompt_tokens ??
    0) as number
  const outputTokens = (usageObj.outputTokens ??
    usageObj.completionTokens ??
    usageObj.completion_tokens ??
    0) as number
  const totalTokens = (usageObj.totalTokens ??
    usageObj.total_tokens ??
    inputTokens + outputTokens) as number

  const result: OpenRouterUsageAccounting = {
    inputTokens,
    outputTokens,
    totalTokens
  }

  // Convert token details if they exist
  const inputTokensDetails =
    usageObj.inputTokensDetails ??
    usageObj.promptTokensDetails ??
    usageObj.prompt_tokens_details
  if (inputTokensDetails) {
    result.inputTokensDetails = inputTokensDetails as Record<string, unknown>
  }

  const outputTokensDetails =
    usageObj.outputTokensDetails ??
    usageObj.completionTokensDetails ??
    usageObj.completion_tokens_details
  if (outputTokensDetails) {
    result.outputTokensDetails = outputTokensDetails as Record<string, unknown>
  }

  // Handle cost properly
  if (usageObj.cost !== undefined) {
    result.cost = usageObj.cost as number
  }

  // Preserve extra properties that aren't v4 token properties
  const v4Properties = new Set([
    'promptTokens',
    'completionTokens',
    'prompt_tokens',
    'completion_tokens',
    'total_tokens',
    'promptTokensDetails',
    'completionTokensDetails',
    'prompt_tokens_details',
    'completion_tokens_details',
    'inputTokens',
    'outputTokens',
    'totalTokens',
    'inputTokensDetails',
    'outputTokensDetails'
  ])

  for (const [key, value] of Object.entries(usageObj)) {
    if (!v4Properties.has(key)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(result as any)[key] = value
    }
  }

  return result
}
