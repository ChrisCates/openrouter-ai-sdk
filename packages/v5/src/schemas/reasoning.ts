import { z } from 'zod'

/**
 * AI SDK v5 compatible reasoning detail types
 * Updated from v4 to follow content-first design pattern
 */
export enum ReasoningDetailType {
  Summary = 'reasoning.summary',
  Encrypted = 'reasoning.encrypted',
  Text = 'reasoning.text'
}

/**
 * Summary reasoning detail schema
 * Used for condensed reasoning information
 */
export const ReasoningDetailSummarySchema = z.object({
  type: z.literal(ReasoningDetailType.Summary),
  summary: z.string()
})
export type ReasoningDetailSummary = z.infer<
  typeof ReasoningDetailSummarySchema
>

/**
 * Encrypted reasoning detail schema
 * Used for secure reasoning content
 */
export const ReasoningDetailEncryptedSchema = z.object({
  type: z.literal(ReasoningDetailType.Encrypted),
  data: z.string()
})
export type ReasoningDetailEncrypted = z.infer<
  typeof ReasoningDetailEncryptedSchema
>

/**
 * Text reasoning detail schema
 * Used for raw reasoning text content
 */
export const ReasoningDetailTextSchema = z.object({
  type: z.literal(ReasoningDetailType.Text),
  text: z.string().nullish(),
  signature: z.string().nullish()
})
export type ReasoningDetailText = z.infer<typeof ReasoningDetailTextSchema>

/**
 * Union schema for all reasoning detail types
 * Supports AI SDK v5 content-first architecture
 */
export const ReasoningDetailUnionSchema = z.union([
  ReasoningDetailSummarySchema,
  ReasoningDetailEncryptedSchema,
  ReasoningDetailTextSchema
])
export type ReasoningDetailUnion = z.infer<typeof ReasoningDetailUnionSchema>

/**
 * Schema for handling unknown reasoning details with graceful fallback
 * Filters out invalid entries while preserving valid ones
 */
const ReasoningDetailsWithUnknownSchema = z.union([
  ReasoningDetailUnionSchema,
  z.unknown().transform(() => null)
])

/**
 * Array schema for reasoning details
 * Automatically filters out invalid entries for robustness
 */
export const ReasoningDetailArraySchema = z
  .array(ReasoningDetailsWithUnknownSchema)
  .transform((details) =>
    details.filter((detail): detail is ReasoningDetailUnion => !!detail)
  )

/**
 * Content part schema for reasoning in AI SDK v5
 * Follows the new content-first design pattern
 */
export const ReasoningContentPartSchema = z.object({
  type: z.literal('reasoning'),
  reasoning: z.string(),
  details: ReasoningDetailArraySchema.optional()
})
export type ReasoningContentPart = z.infer<typeof ReasoningContentPartSchema>

/**
 * Helper function to create a reasoning content part
 * Compatible with AI SDK v5 content structure
 */
export function createReasoningContentPart(
  reasoning: string,
  details?: ReasoningDetailUnion[]
): ReasoningContentPart {
  return {
    type: 'reasoning',
    reasoning,
    ...(details && { details })
  }
}

/**
 * Validates reasoning details array with type safety
 */
export function validateReasoningDetails(
  details: unknown[]
): ReasoningDetailUnion[] {
  const result = ReasoningDetailArraySchema.safeParse(details)
  return result.success ? result.data : []
}
