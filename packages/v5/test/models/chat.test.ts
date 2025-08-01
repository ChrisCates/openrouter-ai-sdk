import { describe, expect, it } from 'bun:test'
import { OpenRouterChatLanguageModel } from '../../src/models/chat'

describe('OpenRouterChatLanguageModel', () => {
  const mockConfig = {
    provider: 'openrouter',
    compatibility: 'strict' as const,
    headers: () => ({ Authorization: 'Bearer test-key' }),
    url: ({ path }: { path: string; modelId: string }) =>
      `https://openrouter.ai/api/v1${path}`,
    fetch: undefined,
    extraBody: {}
  }

  it('should create a chat model instance', () => {
    const model = new OpenRouterChatLanguageModel(
      'openai/gpt-4',
      { apiKey: 'test-key' },
      mockConfig
    )

    expect(model.specificationVersion).toBe('v2')
    expect(model.provider).toBe('openrouter')
    expect(model.modelId).toBe('openai/gpt-4')
    expect(model.defaultObjectGenerationMode).toBe('tool')
  })

  it('should implement OpenRouterLanguageModelV2 interface', () => {
    const model = new OpenRouterChatLanguageModel(
      'openai/gpt-4',
      { apiKey: 'test-key' },
      mockConfig
    )

    // Check that required methods exist
    expect(typeof model.doGenerate).toBe('function')
    expect(typeof model.doStream).toBe('function')
  })

  it('should handle basic chat settings', () => {
    const settings = {
      apiKey: 'test-key',
      temperature: 0.7,
      maxTokens: 1000,
      topP: 0.9,
      includeReasoning: true,
      reasoning: { max_tokens: 500 }
    }

    const model = new OpenRouterChatLanguageModel(
      'openai/gpt-4',
      settings,
      mockConfig
    )

    expect(model.modelId).toBe('openai/gpt-4')
    expect(model.provider).toBe('openrouter')
  })

  it('should convert simple user message to OpenRouter format', () => {
    const model = new OpenRouterChatLanguageModel(
      'openai/gpt-4',
      { apiKey: 'test-key' },
      mockConfig
    )

    const prompt = [
      {
        role: 'user' as const,
        content: 'Hello, world!'
      }
    ]

    // Test the private method indirectly by checking it doesn't throw
    expect(() => {
      // @ts-expect-error - accessing private method for testing
      const messages = model.convertPromptToMessages(prompt)
      expect(Array.isArray(messages)).toBe(true)
    }).not.toThrow()
  })

  it('should handle system messages in prompt conversion', () => {
    const model = new OpenRouterChatLanguageModel(
      'openai/gpt-4',
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
        content: 'Hello!'
      }
    ]

    expect(() => {
      // @ts-expect-error - accessing private method for testing
      const messages = model.convertPromptToMessages(prompt)
      expect(messages.length).toBe(2)
    }).not.toThrow()
  })

  it('should map finish reasons correctly', () => {
    const model = new OpenRouterChatLanguageModel(
      'openai/gpt-4',
      { apiKey: 'test-key' },
      mockConfig
    )

    // @ts-expect-error - accessing private method for testing
    expect(model.mapFinishReason('stop')).toBe('stop')
    // @ts-expect-error - accessing private method for testing
    expect(model.mapFinishReason('length')).toBe('length')
    // @ts-expect-error - accessing private method for testing
    expect(model.mapFinishReason('tool_calls')).toBe('tool-calls')
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
        models: ['gpt-4', 'gpt-3.5-turbo'],
        fallbacks: ['gpt-3.5-turbo']
      }
    }

    const model = new OpenRouterChatLanguageModel(
      'openai/gpt-4',
      { apiKey: 'test-key', providerOptions },
      mockConfig
    )

    expect(model.modelId).toBe('openai/gpt-4')
  })
})
