/**
 * Validates that usage accounting follows current format
 */
export function validateUsage(usage: unknown): void {
  if (!usage || typeof usage !== 'object') {
    throw new Error('Usage is required in v5')
  }

  const usageObj = usage as Record<string, unknown>

  if (usageObj.inputTokens === undefined) {
    throw new Error('inputTokens is required in v5')
  }

  if (usageObj.outputTokens === undefined) {
    throw new Error('outputTokens is required in v5')
  }

  if (usageObj.totalTokens === undefined) {
    throw new Error('totalTokens is required in v5')
  }

  if (typeof usageObj.inputTokens !== 'number') {
    throw new Error('inputTokens must be a number')
  }

  if (typeof usageObj.outputTokens !== 'number') {
    throw new Error('outputTokens must be a number')
  }

  if (typeof usageObj.totalTokens !== 'number') {
    throw new Error('totalTokens must be a number')
  }

  if (typeof usageObj.inputTokens === 'number' && usageObj.inputTokens < 0) {
    throw new Error('inputTokens must be non-negative')
  }

  if (typeof usageObj.outputTokens === 'number' && usageObj.outputTokens < 0) {
    throw new Error('outputTokens must be non-negative')
  }

  if (typeof usageObj.totalTokens === 'number' && usageObj.totalTokens < 0) {
    throw new Error('totalTokens must be non-negative')
  }

  if (usageObj.cost !== undefined && typeof usageObj.cost !== 'number') {
    throw new Error('cost must be a number if provided')
  }
}
