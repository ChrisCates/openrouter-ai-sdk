import { z } from 'zod/v4'
import { createJsonErrorResponseHandler } from '@ai-sdk/provider-utils'

/**
 * OpenRouter error response schema for API v5
 * Follows the AI SDK v5 pattern for error handling
 */
export const OpenRouterErrorResponseSchema = z.object({
  error: z.object({
    code: z.union([z.string(), z.number()]).nullable().optional(),
    message: z.string(),
    type: z.string().nullable().optional(),
    param: z.unknown().nullable().optional()
  })
})

export type OpenRouterErrorData = z.infer<typeof OpenRouterErrorResponseSchema>

/**
 * Error response handler for OpenRouter API
 * Creates standardized error handling following AI SDK v5 patterns
 */
export const openrouterFailedResponseHandler = createJsonErrorResponseHandler({
  errorSchema: OpenRouterErrorResponseSchema,
  errorToMessage: (data: OpenRouterErrorData) => data.error.message
})

/**
 * Validates and transforms error responses for AI SDK v5 compatibility
 */
export function validateErrorResponse(response: unknown): OpenRouterErrorData {
  const result = OpenRouterErrorResponseSchema.safeParse(response)

  if (!result.success) {
    // Fallback for malformed error responses
    return {
      error: {
        message:
          typeof response === 'string' ? response : 'Unknown error occurred',
        type: 'unknown_error',
        code: null
      }
    }
  }

  return result.data
}
