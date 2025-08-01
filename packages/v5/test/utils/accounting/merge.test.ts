// Using bun test globals
import { describe, expect, it } from 'bun:test'
import type { OpenRouterUsageAccounting } from '../../../src/types/usage'
import { addUsage } from '../../../src/utils/accounting/merge'

describe('addUsage', () => {
  it('should add two usage objects correctly', () => {
    const usage1 = {
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      cost: 0.001
    }

    const usage2 = {
      inputTokens: 5,
      outputTokens: 10,
      totalTokens: 15,
      cost: 0.0005
    }

    const result = addUsage(usage1, usage2)

    expect(result).toEqual({
      inputTokens: 15,
      outputTokens: 30,
      totalTokens: 45,
      cost: 0.0015
    })
  })

  it('should handle usage objects without cost', () => {
    const usage1 = {
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30
    }

    const usage2 = {
      inputTokens: 5,
      outputTokens: 10,
      totalTokens: 15
    }

    const result = addUsage(usage1, usage2)

    expect(result).toEqual({
      inputTokens: 15,
      outputTokens: 30,
      totalTokens: 45
    })
  })

  it('should handle mixed cost presence', () => {
    const usage1 = {
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      cost: 0.001
    }

    const usage2 = {
      inputTokens: 5,
      outputTokens: 10,
      totalTokens: 15
    }

    const result = addUsage(usage1, usage2)

    expect(result).toEqual({
      inputTokens: 15,
      outputTokens: 30,
      totalTokens: 45,
      cost: 0.001
    })
  })

  it('should add token details correctly', () => {
    const usage1 = {
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      inputTokensDetails: {
        cachedTokens: 5,
        audioTokens: 2
      },
      outputTokensDetails: {
        reasoningTokens: 8,
        audioTokens: 1
      }
    }

    const usage2 = {
      inputTokens: 5,
      outputTokens: 10,
      totalTokens: 15,
      inputTokensDetails: {
        cachedTokens: 3,
        audioTokens: 1
      },
      outputTokensDetails: {
        reasoningTokens: 4,
        audioTokens: 2
      }
    }

    const result = addUsage(usage1, usage2)

    expect(result).toEqual({
      inputTokens: 15,
      outputTokens: 30,
      totalTokens: 45,
      inputTokensDetails: {
        cachedTokens: 8,
        audioTokens: 3
      },
      outputTokensDetails: {
        reasoningTokens: 12,
        audioTokens: 3
      }
    })
  })

  it('should handle partial token details', () => {
    const usage1 = {
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      inputTokensDetails: {
        cachedTokens: 5
      }
    }

    const usage2 = {
      inputTokens: 5,
      outputTokens: 10,
      totalTokens: 15,
      outputTokensDetails: {
        reasoningTokens: 4
      }
    }

    const result = addUsage(usage1, usage2)

    expect(result).toEqual({
      inputTokens: 15,
      outputTokens: 30,
      totalTokens: 45,
      inputTokensDetails: {
        cachedTokens: 5
      },
      outputTokensDetails: {
        reasoningTokens: 4
      }
    })
  })

  it('should handle zero values correctly', () => {
    const usage1 = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0
    }

    const usage2 = {
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30
    }

    const result = addUsage(usage1, usage2)

    expect(result).toEqual({
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30
    })
  })

  it('should preserve extra properties from both objects', () => {
    const usage1 = {
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      extraProp1: 'value1'
    }

    const usage2 = {
      inputTokens: 5,
      outputTokens: 10,
      totalTokens: 15,
      extraProp2: 'value2'
    }

    const result = addUsage(usage1, usage2)

    expect(result).toEqual({
      inputTokens: 15,
      outputTokens: 30,
      totalTokens: 45,
      extraProp1: 'value1',
      extraProp2: 'value2'
    } as OpenRouterUsageAccounting & Record<string, unknown>)
  })
})
