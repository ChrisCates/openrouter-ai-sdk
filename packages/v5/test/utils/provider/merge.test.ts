// Using bun test globals
import { describe, expect, it } from 'bun:test'
import { mergeProviderOptions } from '../../../src/utils/provider/merge'

describe('mergeProviderOptions', () => {
  it('should merge two provider options objects', () => {
    const options1 = {
      openrouter: {
        reasoning: { max_tokens: 1000 },
        models: ['gpt-4']
      }
    }

    const options2 = {
      openrouter: {
        fallbacks: ['gpt-3.5-turbo'],
        route: 'fallback'
      },
      anthropic: {
        version: '2023-06-01'
      }
    }

    const result = mergeProviderOptions(options1, options2)

    expect(result).toEqual({
      openrouter: {
        reasoning: { max_tokens: 1000 },
        models: ['gpt-4'],
        fallbacks: ['gpt-3.5-turbo'],
        route: 'fallback'
      },
      anthropic: {
        version: '2023-06-01'
      }
    })
  })

  it('should override properties from first options with second options', () => {
    const options1 = {
      openrouter: {
        reasoning: { max_tokens: 1000 },
        models: ['gpt-4'],
        route: 'direct'
      }
    }

    const options2 = {
      openrouter: {
        reasoning: { max_tokens: 2000 },
        route: 'fallback'
      }
    }

    const result = mergeProviderOptions(options1, options2)

    expect(result).toEqual({
      openrouter: {
        reasoning: { max_tokens: 2000 },
        models: ['gpt-4'],
        route: 'fallback'
      }
    })
  })

  it('should handle empty first options', () => {
    const options1 = {}
    const options2 = {
      openrouter: {
        reasoning: { max_tokens: 1000 }
      }
    }

    const result = mergeProviderOptions(options1, options2)

    expect(result).toEqual(options2)
  })

  it('should handle empty second options', () => {
    const options1 = {
      openrouter: {
        reasoning: { max_tokens: 1000 }
      }
    }
    const options2 = {}

    const result = mergeProviderOptions(options1, options2)

    expect(result).toEqual(options1)
  })

  it('should handle both options being empty', () => {
    const result = mergeProviderOptions({}, {})
    expect(result).toEqual({})
  })

  it('should handle undefined first options', () => {
    const options2 = {
      openrouter: {
        reasoning: { max_tokens: 1000 }
      }
    }

    const result = mergeProviderOptions(undefined, options2)

    expect(result).toEqual(options2)
  })

  it('should handle undefined second options', () => {
    const options1 = {
      openrouter: {
        reasoning: { max_tokens: 1000 }
      }
    }

    const result = mergeProviderOptions(options1, undefined)

    expect(result).toEqual(options1)
  })

  it('should handle both options being undefined', () => {
    const result = mergeProviderOptions(undefined, undefined)
    expect(result).toEqual({})
  })

  it('should handle null options', () => {
    const options1 = {
      openrouter: {
        reasoning: { max_tokens: 1000 }
      }
    }

    const result1 = mergeProviderOptions(null, options1)
    const result2 = mergeProviderOptions(options1, null)
    const result3 = mergeProviderOptions(null, null)

    expect(result1).toEqual(options1)
    expect(result2).toEqual(options1)
    expect(result3).toEqual({})
  })

  it('should deep merge nested objects', () => {
    const options1 = {
      openrouter: {
        reasoning: {
          max_tokens: 1000,
          temperature: 0.7
        },
        extra_body: {
          stream_options: { include_usage: true },
          metadata: { user_id: 'user1' }
        }
      }
    }

    const options2 = {
      openrouter: {
        reasoning: {
          max_tokens: 2000
        },
        extra_body: {
          metadata: { session_id: 'session1' }
        }
      }
    }

    const result = mergeProviderOptions(options1, options2)

    expect(result).toEqual({
      openrouter: {
        reasoning: {
          max_tokens: 2000,
          temperature: 0.7
        },
        extra_body: {
          stream_options: { include_usage: true },
          metadata: {
            user_id: 'user1',
            session_id: 'session1'
          }
        }
      }
    })
  })

  it('should merge multiple providers correctly', () => {
    const options1 = {
      openrouter: {
        reasoning: { max_tokens: 1000 }
      },
      anthropic: {
        version: '2023-06-01'
      }
    }

    const options2 = {
      openrouter: {
        models: ['gpt-4']
      },
      openai: {
        organization: 'org-123'
      }
    }

    const result = mergeProviderOptions(options1, options2)

    expect(result).toEqual({
      openrouter: {
        reasoning: { max_tokens: 1000 },
        models: ['gpt-4']
      },
      anthropic: {
        version: '2023-06-01'
      },
      openai: {
        organization: 'org-123'
      }
    })
  })

  it('should handle array properties correctly', () => {
    const options1 = {
      openrouter: {
        models: ['gpt-4', 'claude-3'],
        fallbacks: ['gpt-3.5-turbo']
      }
    }

    const options2 = {
      openrouter: {
        models: ['gpt-4-turbo'],
        transforms: ['transform1']
      }
    }

    const result = mergeProviderOptions(options1, options2)

    expect(result).toEqual({
      openrouter: {
        models: ['gpt-4-turbo'], // Array replaced, not merged
        fallbacks: ['gpt-3.5-turbo'],
        transforms: ['transform1']
      }
    })
  })
})
