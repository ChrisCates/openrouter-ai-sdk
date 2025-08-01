import { z } from 'zod/v4'
import type {
  LanguageModelV2CallOptions,
  LanguageModelV2FinishReason,
  LanguageModelV2Prompt,
  LanguageModelV2StreamPart
} from '@ai-sdk/provider'
import type { ParseResult } from '@ai-sdk/provider-utils'
import {
  combineHeaders,
  createEventSourceResponseHandler,
  createJsonResponseHandler,
  generateId,
  postJsonToApi
} from '@ai-sdk/provider-utils'
import { openrouterFailedResponseHandler } from '../error'
import type { OpenRouterProviderOptions } from '../types'
import { convertUsage } from '../utils/accounting'
import type { OpenRouterLanguageModelV2, OpenRouterModelConfig } from './base'
import { validateUsageAccounting } from './base'

export interface OpenRouterCompletionSettings {
  apiKey?: string
  baseURL?: string
  headers?: Record<string, string>
  user?: string
  temperature?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  seed?: number
  maxTokens?: number
  logitBias?: Record<string, number>
  logprobs?: number
  suffix?: string
  includeReasoning?: boolean
  reasoning?: boolean | object
  extraBody?: Record<string, unknown>
  providerOptions?: OpenRouterProviderOptions
}

export class OpenRouterCompletionLanguageModel
  implements OpenRouterLanguageModelV2
{
  readonly specificationVersion = 'v2' as const
  readonly supportedUrls = {} as Record<string, RegExp[]>
  readonly provider: string
  readonly modelId: string
  readonly defaultObjectGenerationMode = 'json' as const

  private readonly settings: OpenRouterCompletionSettings
  private readonly config: OpenRouterModelConfig

  constructor(
    modelId: string,
    settings: OpenRouterCompletionSettings,
    config: OpenRouterModelConfig
  ) {
    this.modelId = modelId
    this.settings = settings
    this.config = config
    this.provider = config.provider
  }

  private getArgs(options: LanguageModelV2CallOptions) {
    const {
      prompt,
      temperature,
      topP,
      topK,
      frequencyPenalty,
      presencePenalty,
      seed,
      stopSequences,
      responseFormat,
      providerOptions,
      maxOutputTokens
    } = options

    const openrouterOptions = providerOptions?.openrouter ?? {}

    // v2 doesn't have inputFormat, default to 'prompt'
    const completionPrompt = this.convertPromptToString(
      prompt,
      'prompt' as const
    )

    const baseArgs = {
      // Model configuration
      model: this.modelId,

      // Model specific settings
      logit_bias: this.settings.logitBias,
      logprobs: this.settings.logprobs,
      suffix: this.settings.suffix,
      user: this.settings.user,

      // Standardized settings
      prompt: completionPrompt,
      max_tokens: maxOutputTokens ?? this.settings.maxTokens,
      temperature: temperature ?? this.settings.temperature,
      top_p: topP ?? this.settings.topP,
      top_k: topK,
      frequency_penalty: frequencyPenalty ?? this.settings.frequencyPenalty,
      presence_penalty: presencePenalty ?? this.settings.presencePenalty,
      seed: seed ?? this.settings.seed,
      stop: stopSequences,
      response_format: responseFormat,

      // OpenRouter specific settings
      include_reasoning: this.settings.includeReasoning,
      reasoning: this.settings.reasoning,

      // Extra body from various sources
      ...this.config.extraBody,
      ...this.settings.extraBody,
      ...openrouterOptions
    }

    // Handle JSON response format for v2
    if (responseFormat?.type === 'json') {
      return {
        ...baseArgs,
        response_format: { type: 'json_object' }
      }
    }

    return baseArgs
  }

  private convertPromptToString(
    prompt: LanguageModelV2Prompt,
    inputFormat: 'prompt' | 'messages'
  ): string {
    if (inputFormat === 'prompt') {
      // For completion models, if the input format is already 'prompt', convert the prompt array to a string
      return prompt
        .map((msg) => {
          if (msg.role === 'user') {
            return typeof msg.content === 'string'
              ? msg.content
              : (msg.content || [])
                  .map((part) => (part.type === 'text' ? part.text : ''))
                  .join('')
          } else if (msg.role === 'assistant') {
            return msg.content || ''
          } else if (msg.role === 'system') {
            return msg.content || ''
          }
          return ''
        })
        .join('\n')
    } else {
      // Convert messages to a single prompt string for completion API
      return prompt
        .map((msg) => {
          if (msg.role === 'system') {
            return `System: ${msg.content}`
          } else if (msg.role === 'user') {
            const content =
              typeof msg.content === 'string'
                ? msg.content
                : (msg.content || [])
                    .map((part) => (part.type === 'text' ? part.text : ''))
                    .join('')
            return `User: ${content}`
          } else if (msg.role === 'assistant') {
            return `Assistant: ${msg.content || ''}`
          }
          return ''
        })
        .join('\n')
    }
  }

  async doGenerate(options: LanguageModelV2CallOptions) {
    const args = this.getArgs(options)

    const { responseHeaders, value: response } = await postJsonToApi({
      url: this.config.url({
        path: '/completions',
        modelId: this.modelId
      }),
      headers: combineHeaders(this.config.headers(), options.headers),
      body: args,
      failedResponseHandler: openrouterFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        OpenRouterCompletionResponseSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    })

    const { prompt: rawPrompt, ...rawSettings } = args
    const responseData = response as Record<string, unknown>
    const choice = (responseData.choices as unknown[])?.[0]

    if (!choice) {
      throw new Error('No choice in response')
    }

    // Convert v4 usage format to v5 format
    const usageData = responseData.usage as Record<string, unknown> | undefined
    const usage = convertUsage(
      usageData
        ? {
            promptTokens: usageData.prompt_tokens as number,
            completionTokens: usageData.completion_tokens as number,
            totalTokens: usageData.total_tokens as number
          }
        : undefined
    )

    const choiceData = choice as Record<string, unknown>

    // Build content array in v2 format
    const content = []

    // Add text content
    const text = choiceData?.text as string
    if (text) {
      content.push({
        type: 'text' as const,
        text
      })
    }

    // Add reasoning content
    if (choiceData?.reasoning) {
      content.push({
        type: 'reasoning' as const,
        text: choiceData.reasoning as string
      })
    }

    return {
      content,
      finishReason: this.mapFinishReason(choiceData?.finish_reason as string),
      usage: validateUsageAccounting(usage),
      request: { body: { ...rawSettings, prompt: rawPrompt } },
      response: {
        id: responseData.id as string | undefined,
        modelId: responseData.model as string | undefined,
        headers: responseHeaders
      },
      warnings: []
    }
  }

  async doStream(options: LanguageModelV2CallOptions) {
    const args = this.getArgs(options)

    const { responseHeaders, value: response } = await postJsonToApi({
      url: this.config.url({
        path: '/completions',
        modelId: this.modelId
      }),
      headers: combineHeaders(this.config.headers(), options.headers),
      body: {
        ...args,
        stream: true,
        stream_options: {
          include_usage: true
        }
      },
      failedResponseHandler: openrouterFailedResponseHandler,
      successfulResponseHandler: createEventSourceResponseHandler(
        OpenRouterStreamCompletionChunkSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    })

    const { prompt: rawPrompt, ...rawSettings } = args

    // Store reference to mapFinishReason method for transformer context
    const mapFinishReason = this.mapFinishReason.bind(this)

    // Track streaming state for proper three-phase streaming
    let currentTextId: string | null = null
    let currentReasoningId: string | null = null

    return {
      stream: (response as ReadableStream).pipeThrough(
        new TransformStream<
          ParseResult<z.infer<typeof OpenRouterStreamCompletionChunkSchema>>,
          LanguageModelV2StreamPart
        >({
          transform(chunk, controller) {
            if (!chunk.success) {
              controller.enqueue({ type: 'error', error: chunk.error })
              return
            }

            const value = chunk.value

            if (!value || typeof value !== 'object') {
              return
            }

            if ('error' in value) {
              controller.enqueue({ type: 'error', error: value.error })
              return
            }

            // Handle metadata
            if (value.id) {
              controller.enqueue({
                type: 'response-metadata',
                id: value.id
              })
            }

            if (value.model) {
              controller.enqueue({
                type: 'response-metadata',
                modelId: value.model
              })
            }

            if (!Array.isArray(value.choices)) {
              return
            }

            const choice = value.choices[0]
            if (!choice) return

            // Handle text streaming - v5 three-phase pattern
            if (choice.text) {
              if (!currentTextId) {
                // Start new text block
                currentTextId = generateId()
                controller.enqueue({
                  type: 'text-start',
                  id: currentTextId
                })
              }

              // Emit text delta
              controller.enqueue({
                type: 'text-delta',
                id: currentTextId,
                delta: choice.text
              })
            }

            // Handle reasoning streaming - v5 three-phase pattern
            if (choice.reasoning) {
              if (!currentReasoningId) {
                // Start new reasoning block
                currentReasoningId = generateId()
                controller.enqueue({
                  type: 'reasoning-start',
                  id: currentReasoningId
                })
              }

              // Emit reasoning delta
              controller.enqueue({
                type: 'reasoning-delta',
                id: currentReasoningId,
                delta: choice.reasoning
              })
            }

            // Handle finish reason and usage - v5 spec
            if (choice.finish_reason || value.usage) {
              // End any active blocks before finish
              if (currentTextId) {
                controller.enqueue({
                  type: 'text-end',
                  id: currentTextId
                })
                currentTextId = null
              }

              if (currentReasoningId) {
                controller.enqueue({
                  type: 'reasoning-end',
                  id: currentReasoningId
                })
                currentReasoningId = null
              }

              controller.enqueue({
                type: 'finish',
                finishReason: choice.finish_reason
                  ? mapFinishReason(choice.finish_reason)
                  : ('other' as LanguageModelV2FinishReason),
                usage: value.usage
                  ? convertUsage({
                      inputTokens: value.usage.prompt_tokens,
                      outputTokens: value.usage.completion_tokens,
                      totalTokens: value.usage.total_tokens
                    })
                  : convertUsage({})
              })
            }
          },

          flush(controller) {
            // Close any remaining open blocks
            if (currentTextId) {
              controller.enqueue({
                type: 'text-end',
                id: currentTextId
              })
            }

            if (currentReasoningId) {
              controller.enqueue({
                type: 'reasoning-end',
                id: currentReasoningId
              })
            }
          }
        })
      ),
      request: { body: { ...rawSettings, prompt: rawPrompt } },
      response: { headers: responseHeaders },
      warnings: []
    }
  }

  private mapFinishReason(
    finishReason: string | null | undefined
  ): LanguageModelV2FinishReason {
    switch (finishReason) {
      case 'stop':
        return 'stop'
      case 'length':
        return 'length'
      case 'content_filter':
        return 'content-filter'
      default:
        return 'other'
    }
  }
}

// Schemas for response validation
const OpenRouterCompletionResponseSchema = z.object({
  id: z.string().optional(),
  model: z.string().optional(),
  choices: z.array(
    z.object({
      text: z.string(),
      reasoning: z.string().optional(),
      finish_reason: z.string().optional().nullable(),
      index: z.number()
    })
  ),
  usage: z
    .object({
      prompt_tokens: z.number(),
      completion_tokens: z.number(),
      total_tokens: z.number(),
      cost: z.number().optional()
    })
    .optional()
})

const OpenRouterStreamCompletionChunkSchema = z.union([
  z.object({
    id: z.string().optional(),
    model: z.string().optional(),
    choices: z.array(
      z.object({
        text: z.string().optional(),
        reasoning: z.string().optional(),
        finish_reason: z.string().nullable().optional(),
        index: z.number()
      })
    ),
    usage: z
      .object({
        prompt_tokens: z.number(),
        completion_tokens: z.number(),
        total_tokens: z.number(),
        cost: z.number().optional()
      })
      .optional()
  }),
  z.object({
    error: z.object({
      message: z.string(),
      type: z.string().optional(),
      code: z.string().optional()
    })
  })
])
