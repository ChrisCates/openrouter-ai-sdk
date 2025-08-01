// Using bun test globals
import { describe, expect, it } from 'bun:test'
import { convertProviderMetadata } from '../../../src/utils/provider/convert'

describe('convertProviderMetadata', () => {
  it('should convert v4 providerMetadata to v5 providerOptions format', () => {
    const v4Metadata = {
      openrouter: {
        reasoning: {
          max_tokens: 1000
        },
        extra_body: {
          custom_param: 'value'
        }
      }
    }

    const result = convertProviderMetadata(v4Metadata)

    expect(result).toEqual({
      openrouter: {
        reasoning: {
          max_tokens: 1000
        },
        extra_body: {
          custom_param: 'value'
        }
      }
    })
  })

  it('should handle v5 providerOptions passed through unchanged', () => {
    const v5Options = {
      openrouter: {
        models: ['gpt-4'],
        fallbacks: ['gpt-3.5-turbo'],
        route: 'fallback'
      }
    }

    const result = convertProviderMetadata(v5Options)

    expect(result).toEqual(v5Options)
  })

  it('should handle empty provider metadata', () => {
    const result = convertProviderMetadata({})
    expect(result).toEqual({})
  })

  it('should handle undefined provider metadata', () => {
    const result = convertProviderMetadata(undefined)
    expect(result).toEqual({})
  })

  it('should handle null provider metadata', () => {
    const result = convertProviderMetadata(null)
    expect(result).toEqual({})
  })

  it('should preserve non-openrouter provider options', () => {
    const mixedOptions = {
      openrouter: {
        reasoning: { max_tokens: 500 }
      },
      anthropic: {
        version: '2023-06-01'
      },
      openai: {
        organization: 'org-123'
      }
    }

    const result = convertProviderMetadata(mixedOptions)

    expect(result).toEqual(mixedOptions)
  })

  it('should handle complex nested OpenRouter options', () => {
    const complexOptions = {
      openrouter: {
        reasoning: {
          max_tokens: 2000,
          temperature: 0.7
        },
        models: ['anthropic/claude-3-sonnet', 'openai/gpt-4'],
        fallbacks: ['openai/gpt-3.5-turbo'],
        route: 'fallback',
        extra_body: {
          stream_options: {
            include_usage: true
          },
          metadata: {
            user_id: 'user_123',
            session_id: 'session_456'
          }
        }
      }
    }

    const result = convertProviderMetadata(complexOptions)

    expect(result).toEqual(complexOptions)
  })

  it('should handle arrays in provider options', () => {
    const optionsWithArrays = {
      openrouter: {
        models: ['model1', 'model2', 'model3'],
        fallbacks: ['fallback1', 'fallback2'],
        transforms: ['transform_a', 'transform_b']
      }
    }

    const result = convertProviderMetadata(optionsWithArrays)

    expect(result).toEqual(optionsWithArrays)
  })
})
