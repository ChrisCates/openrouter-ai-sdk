// Using bun test globals
import { describe, expect, it } from 'bun:test'
import { createDefaultUsage } from '../../../src/utils/accounting/create'

describe('createDefaultUsage', () => {
  it('should create default usage with zero values', () => {
    const result = createDefaultUsage()

    expect(result).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0
    })
  })

  it('should create usage with specified input and output tokens', () => {
    const result = createDefaultUsage(10, 20)

    expect(result).toEqual({
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30
    })
  })

  it('should include cost when provided', () => {
    const result = createDefaultUsage(10, 20, 0.0015)

    expect(result).toEqual({
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      cost: 0.0015
    })
  })

  it('should handle zero input tokens', () => {
    const result = createDefaultUsage(0, 15)

    expect(result).toEqual({
      inputTokens: 0,
      outputTokens: 15,
      totalTokens: 15
    })
  })

  it('should handle zero output tokens', () => {
    const result = createDefaultUsage(25, 0)

    expect(result).toEqual({
      inputTokens: 25,
      outputTokens: 0,
      totalTokens: 25
    })
  })

  it('should calculate total tokens correctly for large numbers', () => {
    const result = createDefaultUsage(1000, 2000)

    expect(result).toEqual({
      inputTokens: 1000,
      outputTokens: 2000,
      totalTokens: 3000
    })
  })

  it('should not include cost when not provided', () => {
    const result = createDefaultUsage(10, 20)

    expect(result).not.toHaveProperty('cost')
    expect(result.cost).toBeUndefined()
  })

  it('should include zero cost when explicitly provided', () => {
    const result = createDefaultUsage(10, 20, 0)

    expect(result).toEqual({
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      cost: 0
    })
  })
})
