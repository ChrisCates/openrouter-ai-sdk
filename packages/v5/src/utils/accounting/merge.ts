import type { OpenRouterUsageAccounting } from '../../types'

/**
 * Adds two usage accounting objects together
 */
export function addUsage(
  usage1: OpenRouterUsageAccounting,
  usage2: OpenRouterUsageAccounting
): OpenRouterUsageAccounting {
  const result: OpenRouterUsageAccounting = {
    ...usage1,
    ...usage2,
    inputTokens: usage1.inputTokens + usage2.inputTokens,
    outputTokens: usage1.outputTokens + usage2.outputTokens,
    totalTokens: usage1.totalTokens + usage2.totalTokens
  }

  // Properly merge token details by adding numeric values
  if (usage1.inputTokensDetails || usage2.inputTokensDetails) {
    result.inputTokensDetails = {}
    const details1 = usage1.inputTokensDetails || {}
    const details2 = usage2.inputTokensDetails || {}

    // Combine all keys from both objects
    const allKeys = new Set([
      ...Object.keys(details1),
      ...Object.keys(details2)
    ])
    for (const key of allKeys) {
      const val1 = details1[key] || 0
      const val2 = details2[key] || 0
      if (typeof val1 === 'number' && typeof val2 === 'number') {
        result.inputTokensDetails[key] = val1 + val2
      }
    }
  }

  if (usage1.outputTokensDetails || usage2.outputTokensDetails) {
    result.outputTokensDetails = {}
    const details1 = usage1.outputTokensDetails || {}
    const details2 = usage2.outputTokensDetails || {}

    // Combine all keys from both objects
    const allKeys = new Set([
      ...Object.keys(details1),
      ...Object.keys(details2)
    ])
    for (const key of allKeys) {
      const val1 = details1[key] || 0
      const val2 = details2[key] || 0
      if (typeof val1 === 'number' && typeof val2 === 'number') {
        result.outputTokensDetails[key] = val1 + val2
      }
    }
  }

  // Handle cost properly
  if (usage1.cost !== undefined || usage2.cost !== undefined) {
    result.cost = (usage1.cost ?? 0) + (usage2.cost ?? 0)
  }

  // Recalculate totals to ensure accuracy
  result.inputTokens = usage1.inputTokens + usage2.inputTokens
  result.outputTokens = usage1.outputTokens + usage2.outputTokens
  result.totalTokens = usage1.totalTokens + usage2.totalTokens

  return result
}
