// Simple test for completion model functionality
import { describe, expect, it } from 'bun:test'
import { OpenRouterCompletionLanguageModel } from './language.model'

describe('OpenRouterCompletionLanguageModel', () => {
  it('should create model with correct configuration', () => {
    const model = new OpenRouterCompletionLanguageModel(
      'openai/gpt-3.5-turbo-instruct',
      {},
      {
        provider: 'openrouter',
        compatibility: 'strict',
        headers: () => ({ authorization: 'Bearer test' }),
        url: ({ path }) => `https://openrouter.ai/api/v1${path}`
      }
    )

    expect(model.modelId).toBe('openai/gpt-3.5-turbo-instruct')
    expect(model.provider).toBe('openrouter')
    expect(model.specificationVersion).toBe('v1')
    expect(model.defaultObjectGenerationMode).toBe(undefined)
  })
})
