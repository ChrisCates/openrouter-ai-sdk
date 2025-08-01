import type { OpenRouterUsageAccounting } from '../../types'

/**
 * Creates a default usage accounting object
 */
export function createDefaultUsage(
  inputTokens = 0,
  outputTokens = 0,
  cost?: number
): OpenRouterUsageAccounting {
  const result: OpenRouterUsageAccounting = {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens
  }

  if (cost !== undefined) {
    result.cost = cost
  }

  return result
}
