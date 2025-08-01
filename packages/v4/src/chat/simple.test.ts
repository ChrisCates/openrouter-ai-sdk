// Simple test for chat model functionality
import { describe, expect, it } from 'bun:test'
import { OpenRouterChatLanguageModel } from './language.model'

describe('OpenRouterChatLanguageModel', () => {
  it('should create model with correct configuration', () => {
    const model = new OpenRouterChatLanguageModel(
      'anthropic/claude-3.5-sonnet',
      {},
      {
        provider: 'openrouter',
        compatibility: 'strict',
        headers: () => ({ authorization: 'Bearer test' }),
        url: ({ path }) => `https://openrouter.ai/api/v1${path}`
      }
    )

    expect(model.modelId).toBe('anthropic/claude-3.5-sonnet')
    expect(model.provider).toBe('openrouter')
    expect(model.specificationVersion).toBe('v1')
    expect(model.defaultObjectGenerationMode).toBe('tool')
  })
})
