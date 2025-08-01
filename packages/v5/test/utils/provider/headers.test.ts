// Using bun test globals
import { describe, expect, it } from 'bun:test'
import { providerOptionsToHeaders } from '../../../src/utils/provider/headers'

describe('providerOptionsToHeaders', () => {
  it('should convert openrouter provider options to headers', () => {
    const providerOptions = {
      openrouter: {
        httpReferer: 'https://myapp.com',
        xTitle: 'My AI App'
      }
    }

    const result = providerOptionsToHeaders(providerOptions)

    expect(result).toEqual({
      'HTTP-Referer': 'https://myapp.com',
      'X-Title': 'My AI App'
    })
  })

  it('should handle empty provider options', () => {
    const result = providerOptionsToHeaders({})
    expect(result).toEqual({})
  })

  it('should handle undefined provider options', () => {
    const result = providerOptionsToHeaders(undefined)
    expect(result).toEqual({})
  })

  it('should handle null provider options', () => {
    const result = providerOptionsToHeaders(null)
    expect(result).toEqual({})
  })

  it('should handle provider options without openrouter section', () => {
    const providerOptions = {
      anthropic: {
        version: '2023-06-01'
      },
      openai: {
        organization: 'org-123'
      }
    }

    const result = providerOptionsToHeaders(providerOptions)
    expect(result).toEqual({})
  })

  it('should handle empty openrouter section', () => {
    const providerOptions = {
      openrouter: {}
    }

    const result = providerOptionsToHeaders(providerOptions)
    expect(result).toEqual({})
  })

  it('should convert camelCase to kebab-case for headers', () => {
    const providerOptions = {
      openrouter: {
        httpReferer: 'https://example.com',
        xTitle: 'Test App',
        customHeader: 'custom-value',
        anotherLongHeaderName: 'another-value'
      }
    }

    const result = providerOptionsToHeaders(providerOptions)

    expect(result).toEqual({
      'HTTP-Referer': 'https://example.com',
      'X-Title': 'Test App',
      'Custom-Header': 'custom-value',
      'Another-Long-Header-Name': 'another-value'
    })
  })

  it('should ignore non-header openrouter options', () => {
    const providerOptions = {
      openrouter: {
        httpReferer: 'https://example.com',
        xTitle: 'Test App',
        reasoning: { max_tokens: 1000 },
        models: ['gpt-4'],
        fallbacks: ['gpt-3.5-turbo'],
        route: 'fallback'
      }
    }

    const result = providerOptionsToHeaders(providerOptions)

    expect(result).toEqual({
      'HTTP-Referer': 'https://example.com',
      'X-Title': 'Test App'
    })
  })

  it('should handle only recognized header fields', () => {
    const providerOptions = {
      openrouter: {
        httpReferer: 'https://example.com',
        xTitle: 'Test App',
        randomProperty: 'should be ignored',
        anotherProperty: 123
      }
    }

    const result = providerOptionsToHeaders(providerOptions)

    expect(result).toEqual({
      'HTTP-Referer': 'https://example.com',
      'X-Title': 'Test App'
    })
  })

  it('should handle string values only for headers', () => {
    const providerOptions = {
      openrouter: {
        httpReferer: 'https://example.com',
        xTitle: 123, // Should be ignored or converted
        validHeader: 'valid-value'
      }
    }

    const result = providerOptionsToHeaders(providerOptions)

    // Should only include string values
    expect(result).toEqual({
      'HTTP-Referer': 'https://example.com',
      'Valid-Header': 'valid-value'
    })
  })

  it('should handle undefined and null header values', () => {
    const providerOptions = {
      openrouter: {
        httpReferer: 'https://example.com',
        anotherHeader: 'valid'
      }
    }

    const result = providerOptionsToHeaders(providerOptions)

    expect(result).toEqual({
      'HTTP-Referer': 'https://example.com',
      'Another-Header': 'valid'
    })
  })

  it('should handle empty string header values', () => {
    const providerOptions = {
      openrouter: {
        httpReferer: '',
        xTitle: 'Test App'
      }
    }

    const result = providerOptionsToHeaders(providerOptions)

    expect(result).toEqual({
      'X-Title': 'Test App'
    })
  })
})
