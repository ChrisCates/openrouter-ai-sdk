// Using bun test globals
import { describe, expect, it } from 'bun:test'
import { validateProviderOptions } from '../../../src/utils/provider/validate'

describe('validateProviderOptions', () => {
  it('should validate correct provider options', () => {
    const options = {
      openrouter: {
        reasoning: {
          max_tokens: 1000
        },
        models: ['gpt-4'],
        fallbacks: ['gpt-3.5-turbo']
      }
    }

    expect(() => validateProviderOptions(options)).not.toThrow()
  })

  it('should validate empty provider options', () => {
    expect(() => validateProviderOptions({})).not.toThrow()
  })

  it('should validate undefined provider options', () => {
    expect(() => validateProviderOptions(undefined)).not.toThrow()
  })

  it('should validate null provider options', () => {
    expect(() => validateProviderOptions(null)).not.toThrow()
  })

  it('should throw error for non-object provider options', () => {
    expect(() => validateProviderOptions('invalid')).toThrow(
      'Provider options must be an object'
    )
  })

  it('should throw error for array provider options', () => {
    expect(() => validateProviderOptions(['invalid'])).toThrow(
      'Provider options must be an object'
    )
  })

  it('should throw error for number provider options', () => {
    expect(() => validateProviderOptions(123)).toThrow(
      'Provider options must be an object'
    )
  })

  it('should validate nested object structure', () => {
    const options = {
      openrouter: {
        reasoning: {
          max_tokens: 1000,
          temperature: 0.7
        },
        extra_body: {
          stream_options: {
            include_usage: true
          }
        }
      }
    }

    expect(() => validateProviderOptions(options)).not.toThrow()
  })

  it('should validate multiple providers', () => {
    const options = {
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

    expect(() => validateProviderOptions(options)).not.toThrow()
  })

  it('should validate array values in provider options', () => {
    const options = {
      openrouter: {
        models: ['model1', 'model2'],
        fallbacks: ['fallback1', 'fallback2'],
        transforms: []
      }
    }

    expect(() => validateProviderOptions(options)).not.toThrow()
  })

  it('should validate mixed data types in provider options', () => {
    const options = {
      openrouter: {
        stringValue: 'test',
        numberValue: 42,
        booleanValue: true,
        arrayValue: [1, 2, 3],
        objectValue: { nested: 'value' },
        nullValue: null
      }
    }

    expect(() => validateProviderOptions(options)).not.toThrow()
  })

  it('should handle deeply nested objects', () => {
    const options = {
      openrouter: {
        level1: {
          level2: {
            level3: {
              level4: {
                deepValue: 'success'
              }
            }
          }
        }
      }
    }

    expect(() => validateProviderOptions(options)).not.toThrow()
  })
})
