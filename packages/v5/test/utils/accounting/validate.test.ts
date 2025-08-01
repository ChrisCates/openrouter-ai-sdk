// Using bun test globals
import { describe, expect, it } from 'bun:test'
import { validateUsage } from '../../../src/utils/accounting/validate'

describe('validateUsage', () => {
  it('should validate correct v5 usage format', () => {
    const usage = {
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
    }

    expect(() => validateUsage(usage)).not.toThrow()
  })

  it('should validate minimal valid usage format', () => {
    const usage = {
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30
    }

    expect(() => validateUsage(usage)).not.toThrow()
  })

  it('should throw error when inputTokens is missing', () => {
    const usage = {
      outputTokens: 20,
      totalTokens: 30
    }

    expect(() => validateUsage(usage)).toThrow('inputTokens is required in v5')
  })

  it('should throw error when outputTokens is missing', () => {
    const usage = {
      inputTokens: 10,
      totalTokens: 30
    }

    expect(() => validateUsage(usage)).toThrow('outputTokens is required in v5')
  })

  it('should throw error when totalTokens is missing', () => {
    const usage = {
      inputTokens: 10,
      outputTokens: 20
    }

    expect(() => validateUsage(usage)).toThrow('totalTokens is required in v5')
  })

  it('should throw error when inputTokens is not a number', () => {
    const usage = {
      inputTokens: '10',
      outputTokens: 20,
      totalTokens: 30
    }

    expect(() => validateUsage(usage)).toThrow('inputTokens must be a number')
  })

  it('should throw error when outputTokens is not a number', () => {
    const usage = {
      inputTokens: 10,
      outputTokens: '20',
      totalTokens: 30
    }

    expect(() => validateUsage(usage)).toThrow('outputTokens must be a number')
  })

  it('should throw error when totalTokens is not a number', () => {
    const usage = {
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: '30'
    }

    expect(() => validateUsage(usage)).toThrow('totalTokens must be a number')
  })

  it('should throw error when inputTokens is negative', () => {
    const usage = {
      inputTokens: -5,
      outputTokens: 20,
      totalTokens: 15
    }

    expect(() => validateUsage(usage)).toThrow(
      'inputTokens must be non-negative'
    )
  })

  it('should throw error when outputTokens is negative', () => {
    const usage = {
      inputTokens: 10,
      outputTokens: -5,
      totalTokens: 5
    }

    expect(() => validateUsage(usage)).toThrow(
      'outputTokens must be non-negative'
    )
  })

  it('should throw error when totalTokens is negative', () => {
    const usage = {
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: -30
    }

    expect(() => validateUsage(usage)).toThrow(
      'totalTokens must be non-negative'
    )
  })

  it('should allow zero token counts', () => {
    const usage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0
    }

    expect(() => validateUsage(usage)).not.toThrow()
  })

  it('should throw error when usage is null', () => {
    expect(() => validateUsage(null)).toThrow('Usage is required in v5')
  })

  it('should throw error when usage is undefined', () => {
    expect(() => validateUsage(undefined)).toThrow('Usage is required in v5')
  })

  it('should validate with optional cost field', () => {
    const usage = {
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      cost: 0.0015
    }

    expect(() => validateUsage(usage)).not.toThrow()
  })

  it('should validate with token details', () => {
    const usage = {
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

    expect(() => validateUsage(usage)).not.toThrow()
  })
})
