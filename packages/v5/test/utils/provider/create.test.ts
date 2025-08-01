// Using bun test globals
import { describe, expect, it } from 'bun:test'
import {
  createDefaultProviderOptions,
  extractOpenRouterOptions
} from '../../../src/utils/provider/create'

describe('createDefaultProviderOptions', () => {
  it('should create empty provider options by default', () => {
    const result = createDefaultProviderOptions()
    expect(result).toEqual({})
  })

  it('should create provider options with openrouter section', () => {
    const openrouterOptions = {
      reasoning: { max_tokens: 1000 },
      models: ['gpt-4']
    }

    const result = createDefaultProviderOptions(openrouterOptions)

    expect(result).toEqual({
      openrouter: {
        reasoning: { max_tokens: 1000 },
        models: ['gpt-4']
      }
    })
  })

  it('should handle undefined openrouter options', () => {
    const result = createDefaultProviderOptions(undefined)
    expect(result).toEqual({})
  })

  it('should handle null openrouter options', () => {
    const result = createDefaultProviderOptions(null)
    expect(result).toEqual({})
  })

  it('should handle empty openrouter options', () => {
    const result = createDefaultProviderOptions({})
    expect(result).toEqual({
      openrouter: {}
    })
  })

  it('should preserve complex nested structures', () => {
    const complexOptions = {
      reasoning: {
        max_tokens: 2000,
        temperature: 0.8
      },
      extra_body: {
        stream_options: { include_usage: true },
        metadata: { user_id: 'test' }
      },
      models: ['model1', 'model2'],
      fallbacks: ['fallback1']
    }

    const result = createDefaultProviderOptions(complexOptions)

    expect(result).toEqual({
      openrouter: complexOptions
    })
  })
})

describe('extractOpenRouterOptions', () => {
  it('should extract openrouter options from provider options', () => {
    const providerOptions = {
      openrouter: {
        reasoning: { max_tokens: 1000 },
        models: ['gpt-4'],
        fallbacks: ['gpt-3.5-turbo']
      },
      anthropic: {
        version: '2023-06-01'
      }
    }

    const result = extractOpenRouterOptions(providerOptions)

    expect(result).toEqual({
      reasoning: { max_tokens: 1000 },
      models: ['gpt-4'],
      fallbacks: ['gpt-3.5-turbo']
    })
  })

  it('should return empty object when no openrouter options exist', () => {
    const providerOptions = {
      anthropic: {
        version: '2023-06-01'
      },
      openai: {
        organization: 'org-123'
      }
    }

    const result = extractOpenRouterOptions(providerOptions)
    expect(result).toEqual({})
  })

  it('should return empty object for undefined provider options', () => {
    const result = extractOpenRouterOptions(undefined)
    expect(result).toEqual({})
  })

  it('should return empty object for null provider options', () => {
    const result = extractOpenRouterOptions(null)
    expect(result).toEqual({})
  })

  it('should return empty object for empty provider options', () => {
    const result = extractOpenRouterOptions({})
    expect(result).toEqual({})
  })

  it('should handle openrouter section with empty object', () => {
    const providerOptions = {
      openrouter: {}
    }

    const result = extractOpenRouterOptions(providerOptions)
    expect(result).toEqual({})
  })

  it('should preserve nested structure in openrouter options', () => {
    const providerOptions = {
      openrouter: {
        reasoning: {
          max_tokens: 1500,
          temperature: 0.9
        },
        extra_body: {
          metadata: {
            session: 'abc123',
            user: {
              id: 'user456',
              role: 'premium'
            }
          }
        },
        models: ['model1', 'model2'],
        fallbacks: []
      }
    }

    const result = extractOpenRouterOptions(providerOptions)

    expect(result).toEqual({
      reasoning: {
        max_tokens: 1500,
        temperature: 0.9
      },
      extra_body: {
        metadata: {
          session: 'abc123',
          user: {
            id: 'user456',
            role: 'premium'
          }
        }
      },
      models: ['model1', 'model2'],
      fallbacks: []
    })
  })

  it('should not modify the original provider options object', () => {
    const providerOptions = {
      openrouter: {
        reasoning: { max_tokens: 1000 }
      }
    }

    const originalOpenRouter = providerOptions.openrouter
    const result = extractOpenRouterOptions(providerOptions)

    expect(result).toEqual(originalOpenRouter)
    expect(result).not.toBe(originalOpenRouter) // Should be a copy, not reference
  })
})
