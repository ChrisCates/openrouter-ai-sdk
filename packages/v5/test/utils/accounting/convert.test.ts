// Using bun test globals
import { describe, expect, it } from 'bun:test'
import type { OpenRouterUsageAccounting } from '../../../src/types/usage'
import { convertUsage } from '../../../src/utils/accounting/convert'

describe('convertUsage', () => {
  it('should convert v4 usage format to v5 format', () => {
    const v4Usage = {
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
      promptTokensDetails: {
        cachedTokens: 5
      },
      completionTokensDetails: {
        reasoningTokens: 8
      },
      cost: 0.0015
    }

    const result = convertUsage(v4Usage)

    expect(result).toEqual({
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      inputTokensDetails: {
        cachedTokens: 5
      },
      outputTokensDetails: {
        reasoningTokens: 8
      },
      cost: 0.0015
    })
  })

  it('should handle v5 format passed through unchanged', () => {
    const v5Usage = {
      inputTokens: 15,
      outputTokens: 25,
      totalTokens: 40,
      inputTokensDetails: {
        cachedTokens: 3
      },
      outputTokensDetails: {
        reasoningTokens: 12
      },
      cost: 0.002
    }

    const result = convertUsage(v5Usage)

    expect(result).toEqual(v5Usage)
  })

  it('should calculate totalTokens when missing', () => {
    const usage = {
      inputTokens: 10,
      outputTokens: 20,
      cost: 0.0015
    }

    const result = convertUsage(usage)

    expect(result).toEqual({
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      cost: 0.0015
    })
  })

  it('should handle missing optional fields gracefully', () => {
    const usage = {
      promptTokens: 5,
      completionTokens: 10
    }

    const result = convertUsage(usage)

    expect(result).toEqual({
      inputTokens: 5,
      outputTokens: 10,
      totalTokens: 15
    })
  })

  it('should prioritize v5 property names over v4 when both exist', () => {
    const mixedUsage = {
      promptTokens: 10,
      inputTokens: 15,
      completionTokens: 20,
      outputTokens: 25,
      totalTokens: 50
    }

    const result = convertUsage(mixedUsage)

    expect(result).toEqual({
      inputTokens: 15,
      outputTokens: 25,
      totalTokens: 50
    })
  })

  it('should handle empty usage object', () => {
    const result = convertUsage({})

    expect(result).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0
    })
  })

  it('should preserve extra properties', () => {
    const usage = {
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      extraProperty: 'preserved'
    }

    const result = convertUsage(usage)

    expect(result).toEqual({
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      extraProperty: 'preserved'
    } as OpenRouterUsageAccounting & Record<string, unknown>)
  })
})
