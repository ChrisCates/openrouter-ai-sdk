import { describe, expect, it } from 'bun:test'
import { OpenRouterCompletionLanguageModel } from '../../src/models/completion'

describe('OpenRouterCompletionLanguageModel', () => {
  const mockConfig = {
    provider: 'openrouter',
    compatibility: 'strict' as const,
    headers: () => ({ Authorization: 'Bearer test-key' }),
    url: ({ path }: { path: string; modelId: string }) =>
      `https://openrouter.ai/api/v1${path}`,
    fetch: undefined,
    extraBody: {}
  }

  it('should create a completion model instance', () => {
    const model = new OpenRouterCompletionLanguageModel(
      'openai/gpt-3.5-turbo-instruct',
      { apiKey: 'test-key' },
      mockConfig
    )

    expect(model.specificationVersion).toBe('v2')
    expect(model.provider).toBe('openrouter')
    expect(model.modelId).toBe('openai/gpt-3.5-turbo-instruct')
    expect(model.defaultObjectGenerationMode).toBe('json')
  })

  it('should implement OpenRouterLanguageModelV2 interface', () => {
    const model = new OpenRouterCompletionLanguageModel(
      'openai/gpt-3.5-turbo-instruct',
      { apiKey: 'test-key' },
      mockConfig
    )

    // Check that required methods exist
    expect(typeof model.doGenerate).toBe('function')
    expect(typeof model.doStream).toBe('function')
  })

  it('should handle basic completion settings', () => {
    const settings = {
      apiKey: 'test-key',
      temperature: 0.7,
      maxTokens: 1000,
      topP: 0.9,
      suffix: '###',
      includeReasoning: true,
      reasoning: { max_tokens: 500 }
    }

    const model = new OpenRouterCompletionLanguageModel(
      'openai/gpt-3.5-turbo-instruct',
      settings,
      mockConfig
    )

    expect(model.modelId).toBe('openai/gpt-3.5-turbo-instruct')
    expect(model.provider).toBe('openrouter')
  })

  it('should convert messages to completion prompt string', () => {
    const model = new OpenRouterCompletionLanguageModel(
      'openai/gpt-3.5-turbo-instruct',
      { apiKey: 'test-key' },
      mockConfig
    )

    const prompt = [
      {
        role: 'system' as const,
        content: 'You are a helpful assistant.'
      },
      {
        role: 'user' as const,
        content: 'Write a story about a cat.'
      }
    ]

    // Test the private method indirectly
    expect(() => {
      // @ts-expect-error - accessing private method for testing
      const promptString = model.convertPromptToString(prompt, 'messages')
      expect(typeof promptString).toBe('string')
      expect(promptString.length).toBeGreaterThan(0)
    }).not.toThrow()
  })

  it('should handle prompt format for completion input', () => {
    const model = new OpenRouterCompletionLanguageModel(
      'openai/gpt-3.5-turbo-instruct',
      { apiKey: 'test-key' },
      mockConfig
    )

    const prompt = [
      {
        role: 'user' as const,
        content: 'Complete this sentence: The quick brown fox'
      }
    ]

    expect(() => {
      // @ts-expect-error - accessing private method for testing
      const promptString = model.convertPromptToString(prompt, 'prompt')
      expect(typeof promptString).toBe('string')
      expect(promptString).toContain('The quick brown fox')
    }).not.toThrow()
  })

  it('should map finish reasons correctly', () => {
    const model = new OpenRouterCompletionLanguageModel(
      'openai/gpt-3.5-turbo-instruct',
      { apiKey: 'test-key' },
      mockConfig
    )

    // @ts-expect-error - accessing private method for testing
    expect(model.mapFinishReason('stop')).toBe('stop')
    // @ts-expect-error - accessing private method for testing
    expect(model.mapFinishReason('length')).toBe('length')
    // @ts-expect-error - accessing private method for testing
    expect(model.mapFinishReason('content_filter')).toBe('content-filter')
    // @ts-expect-error - accessing private method for testing
    expect(model.mapFinishReason('unknown')).toBe('other')
    // @ts-expect-error - accessing private method for testing
    expect(model.mapFinishReason(null)).toBe('other')
  })

  it('should handle provider options correctly', () => {
    const providerOptions = {
      openrouter: {
        reasoning: { max_tokens: 1000 },
        models: ['gpt-3.5-turbo-instruct'],
        fallbacks: ['text-davinci-003']
      }
    }

    const model = new OpenRouterCompletionLanguageModel(
      'openai/gpt-3.5-turbo-instruct',
      { apiKey: 'test-key', providerOptions },
      mockConfig
    )

    expect(model.modelId).toBe('openai/gpt-3.5-turbo-instruct')
  })

  it('should handle multimodal content in prompt conversion', () => {
    const model = new OpenRouterCompletionLanguageModel(
      'openai/gpt-3.5-turbo-instruct',
      { apiKey: 'test-key' },
      mockConfig
    )

    const prompt = [
      {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: 'Hello' },
          { type: 'text' as const, text: 'World' }
        ]
      }
    ]

    expect(() => {
      // @ts-expect-error - accessing private method for testing
      const promptString = model.convertPromptToString(prompt, 'messages')
      expect(typeof promptString).toBe('string')
      expect(promptString).toContain('HelloWorld')
    }).not.toThrow()
  })
})
