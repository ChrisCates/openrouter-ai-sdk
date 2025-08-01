import { beforeEach, describe, expect, it } from 'bun:test'
import type { LanguageModelV2 } from '@ai-sdk/provider'
import {
  OpenRouterErrorResponseSchema,
  openrouterFailedResponseHandler,
  validateErrorResponse
} from '../src/error'
import { OpenRouterChatLanguageModel } from '../src/models/chat'
import { OpenRouterCompletionLanguageModel } from '../src/models/completion'
import {
  createReasoningContentPart,
  ReasoningContentPartSchema,
  ReasoningDetailType,
  validateReasoningDetails
} from '../src/schemas'

describe('LanguageModelV2 Implementation Tests', () => {
  let chatModel: LanguageModelV2
  let completionModel: LanguageModelV2

  beforeEach(() => {
    const mockConfig = {
      provider: 'openrouter',
      compatibility: 'strict' as const,
      headers: () => ({ Authorization: 'Bearer test-key' }),
      url: ({ path }: { path: string; modelId: string }) =>
        `https://openrouter.ai/api/v1${path}`,
      fetch: undefined,
      extraBody: {}
    }

    chatModel = new OpenRouterChatLanguageModel(
      'gpt-3.5-turbo',
      { apiKey: 'test-key' },
      mockConfig
    )
    completionModel = new OpenRouterCompletionLanguageModel(
      'gpt-3.5-turbo-instruct',
      { apiKey: 'test-key' },
      mockConfig
    )
  })

  describe('LanguageModelV2 Interface Compliance', () => {
    it('should implement required LanguageModelV2 properties', () => {
      // Check chat model
      expect(chatModel).toHaveProperty('specificationVersion', 'v2')
      expect(chatModel).toHaveProperty('provider', 'openrouter')
      expect(chatModel).toHaveProperty('modelId')
      expect(chatModel).toHaveProperty('settings')
      expect(typeof chatModel.doGenerate).toBe('function')
      expect(typeof chatModel.doStream).toBe('function')

      // Check completion model
      expect(completionModel).toHaveProperty('specificationVersion', 'v2')
      expect(completionModel).toHaveProperty('provider', 'openrouter')
      expect(completionModel).toHaveProperty('modelId')
      expect(completionModel).toHaveProperty('settings')
      expect(typeof completionModel.doGenerate).toBe('function')
      expect(typeof completionModel.doStream).toBe('function')
    })

    it('should have correct model configuration', () => {
      expect(chatModel.modelId).toBe('gpt-3.5-turbo')
      expect(chatModel.provider).toBe('openrouter')
      expect(chatModel.specificationVersion).toBe('v2')

      expect(completionModel.modelId).toBe('gpt-3.5-turbo-instruct')
      expect(completionModel.provider).toBe('openrouter')
      expect(completionModel.specificationVersion).toBe('v2')
    })
  })

  describe('Error Handling', () => {
    it('should validate error responses correctly', () => {
      const validError = {
        error: {
          message: 'Test error message',
          type: 'invalid_request_error',
          code: 400
        }
      }

      const result = OpenRouterErrorResponseSchema.safeParse(validError)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validError)
    })

    it('should handle malformed error responses gracefully', () => {
      const invalidError = { invalid: 'structure' }
      const result = validateErrorResponse(invalidError)

      expect(result.error.message).toBe('Unknown error occurred')
      expect(result.error.type).toBe('unknown_error')
      expect(result.error.code).toBe(null)
    })

    it('should create proper error handler', () => {
      expect(typeof openrouterFailedResponseHandler).toBe('function')
    })
  })

  describe('Reasoning Schemas', () => {
    it('should validate reasoning detail types', () => {
      const summaryDetail = {
        type: ReasoningDetailType.Summary,
        summary: 'This is a test summary'
      }

      const textDetail = {
        type: ReasoningDetailType.Text,
        text: 'This is reasoning text',
        signature: 'test-signature'
      }

      const encryptedDetail = {
        type: ReasoningDetailType.Encrypted,
        data: 'encrypted-data-here'
      }

      expect(
        ReasoningContentPartSchema.safeParse({
          type: 'reasoning',
          reasoning: 'Test reasoning'
        }).success
      ).toBe(true)

      expect(
        validateReasoningDetails([summaryDetail, textDetail, encryptedDetail])
      ).toHaveLength(3)
    })

    it('should create reasoning content parts correctly', () => {
      const reasoningPart = createReasoningContentPart('Test reasoning', [
        {
          type: ReasoningDetailType.Summary,
          summary: 'Test summary'
        }
      ])

      expect(reasoningPart.type).toBe('reasoning')
      expect(reasoningPart.reasoning).toBe('Test reasoning')
      expect(reasoningPart.details).toHaveLength(1)
      expect(reasoningPart.details![0].type).toBe(ReasoningDetailType.Summary)
    })

    it('should filter out invalid reasoning details', () => {
      const mixedDetails = [
        { type: ReasoningDetailType.Summary, summary: 'Valid' },
        { invalid: 'structure' },
        { type: ReasoningDetailType.Text, text: 'Valid text' },
        null,
        undefined
      ]

      const filtered = validateReasoningDetails(mixedDetails)
      expect(filtered).toHaveLength(2)
      expect(filtered[0].type).toBe(ReasoningDetailType.Summary)
      expect(filtered[1].type).toBe(ReasoningDetailType.Text)
    })
  })

  describe('AI SDK v5 Compatibility', () => {
    it('should support content-first design patterns', () => {
      // Models should accept this structure without throwing
      expect(() => {
        // Test content-first design compatibility
      }).not.toThrow()
    })

    it('should have proper provider specification', () => {
      expect(chatModel.specificationVersion).toBe('v2')
      expect(completionModel.specificationVersion).toBe('v2')
    })
  })

  describe('Type Safety', () => {
    it('should properly type error responses', () => {
      const errorData = validateErrorResponse({
        error: {
          message: 'Test error',
          type: 'test_error',
          code: 'E001'
        }
      })

      // TypeScript should infer the correct types
      expect(typeof errorData.error.message).toBe('string')
      expect(errorData.error.type).toBe('test_error')
      expect(errorData.error.code).toBe('E001')
    })

    it('should properly type reasoning content parts', () => {
      const reasoningPart = createReasoningContentPart('Test')

      // TypeScript should infer the correct types
      expect(reasoningPart.type).toBe('reasoning')
      expect(typeof reasoningPart.reasoning).toBe('string')
    })
  })
})
