import { z } from 'zod/v4'
import type {
  LanguageModelV2CallOptions,
  LanguageModelV2FinishReason,
  LanguageModelV2FunctionTool,
  LanguageModelV2Prompt,
  LanguageModelV2ProviderDefinedTool,
  LanguageModelV2StreamPart
} from '@ai-sdk/provider'
import type { ParseResult } from '@ai-sdk/provider-utils'
import {
  combineHeaders,
  convertUint8ArrayToBase64,
  createEventSourceResponseHandler,
  createJsonResponseHandler,
  generateId,
  postJsonToApi
} from '@ai-sdk/provider-utils'
import { openrouterFailedResponseHandler } from '../error'
import type { OpenRouterProviderOptions } from '../types'
import { convertUsage } from '../utils/accounting'
import type { OpenRouterLanguageModelV2, OpenRouterModelConfig } from './base'
import { isFunctionTool, validateUsageAccounting } from './base'

export interface OpenRouterChatSettings {
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
  logprobs?: boolean | number
  topLogprobs?: number
  parallelToolCalls?: boolean
  includeReasoning?: boolean
  reasoning?: boolean | object
  usage?: boolean
  extraBody?: Record<string, unknown>
  providerOptions?: OpenRouterProviderOptions
}

export class OpenRouterChatLanguageModel implements OpenRouterLanguageModelV2 {
  readonly specificationVersion = 'v2' as const
  readonly supportedUrls = {} as Record<string, RegExp[]>
  readonly provider: string
  readonly modelId: string
  readonly defaultObjectGenerationMode = 'tool' as const

  private readonly settings: OpenRouterChatSettings
  private readonly config: OpenRouterModelConfig

  constructor(
    modelId: string,
    settings: OpenRouterChatSettings,
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
      tools,
      toolChoice,
      providerOptions,
      maxOutputTokens,
      headers: _headers
    } = options

    const openrouterOptions = providerOptions?.openrouter ?? {}

    const baseArgs = {
      // Model configuration
      model: this.modelId,

      // Model specific settings
      logit_bias: this.settings.logitBias,
      logprobs:
        this.settings.logprobs === true ||
        typeof this.settings.logprobs === 'number'
          ? true
          : undefined,
      top_logprobs:
        typeof this.settings.logprobs === 'number'
          ? this.settings.logprobs
          : undefined,
      user: this.settings.user,
      parallel_tool_calls: this.settings.parallelToolCalls,

      // Standardized settings
      max_tokens: maxOutputTokens ?? this.settings.maxTokens,
      temperature: temperature ?? this.settings.temperature,
      top_p: topP ?? this.settings.topP,
      top_k: topK,
      frequency_penalty: frequencyPenalty ?? this.settings.frequencyPenalty,
      presence_penalty: presencePenalty ?? this.settings.presencePenalty,
      seed: seed ?? this.settings.seed,
      stop: stopSequences,
      response_format: responseFormat,

      // Messages conversion (v5 uses content-first design)
      messages: this.convertPromptToMessages(prompt),

      // OpenRouter specific settings
      include_reasoning: this.settings.includeReasoning,
      reasoning: this.settings.reasoning,
      usage: this.settings.usage,

      // Extra body from various sources
      ...this.config.extraBody,
      ...this.settings.extraBody,
      ...openrouterOptions
    }

    // Handle different response formats
    let finalArgs = { ...baseArgs }

    // Add tools and tool choice if present
    if (tools && tools.length > 0) {
      const toolsResult = this.prepareToolsAndToolChoice(tools, toolChoice)
      finalArgs = { ...finalArgs, ...toolsResult }
    }

    // Handle JSON response format
    if (responseFormat?.type === 'json') {
      // Keep internal OpenRouter format as json_object
      ;(finalArgs as Record<string, unknown>).response_format = {
        type: 'json_object'
      }
    } else if (responseFormat) {
      finalArgs.response_format = responseFormat
    }

    return finalArgs
  }

  private convertPromptToMessages(prompt: LanguageModelV2Prompt) {
    // Convert LanguageModelV2Prompt to OpenRouter chat messages format
    // In v5, this handles the content-first design with content parts
    const messages = []

    for (const message of prompt) {
      if (message.role === 'system') {
        messages.push({
          role: 'system',
          content: message.content
        })
      } else if (message.role === 'user') {
        if (typeof message.content === 'string') {
          messages.push({
            role: 'user',
            content: message.content
          })
        } else {
          // Handle multimodal content parts
          const content = []
          for (const part of message.content) {
            if (part.type === 'text') {
              content.push({
                type: 'text',
                text: part.text
              })
            } else if (part.type === 'file') {
              const filePart = part as unknown as Record<string, unknown>
              // Check both mediaType (v5 standard) and mimeType (legacy/compatibility)
              const mediaType = (filePart.mediaType ||
                filePart.mimeType) as string
              if (mediaType && mediaType.startsWith('image/')) {
                content.push({
                  type: 'image_url',
                  image_url: {
                    url:
                      filePart.data instanceof URL
                        ? filePart.data.toString()
                        : filePart.data instanceof Uint8Array
                          ? `data:${mediaType};base64,${convertUint8ArrayToBase64(filePart.data)}`
                          : typeof filePart.data === 'object' &&
                              filePart.data &&
                              'toString' in filePart.data
                            ? `data:${mediaType};base64,${(filePart.data as Buffer).toString('base64')}`
                            : typeof filePart.data === 'string' &&
                                filePart.data.startsWith('data:')
                              ? (filePart.data as string)
                              : `data:${mediaType};base64,${filePart.data}`
                  }
                })
              } else {
                content.push({
                  type: 'file',
                  file: {
                    filename: filePart.filename,
                    file_data: filePart.data
                  }
                })
              }
            }
          }
          messages.push({
            role: 'user',
            content
          })
        }
      } else if (message.role === 'assistant') {
        const msg: Record<string, unknown> = {
          role: 'assistant',
          content: message.content
        }

        const messageAny = message as Record<string, unknown>
        if ((messageAny.toolCalls as unknown[])?.length) {
          msg.tool_calls = (messageAny.toolCalls as unknown[]).map(
            (tc: unknown) => {
              const toolCall = tc as Record<string, unknown>
              return {
                id: toolCall.toolCallId,
                type: 'function',
                function: {
                  name: toolCall.toolName,
                  arguments: toolCall.args // v2 uses 'args'
                }
              }
            }
          )
        }

        messages.push(msg)
      } else if (message.role === 'tool') {
        const toolMessage = message as Record<string, unknown>
        messages.push({
          role: 'tool',
          tool_call_id: toolMessage.toolCallId,
          content: toolMessage.result
        })
      }
    }

    return messages
  }

  private prepareToolsAndToolChoice(
    tools?: (
      | LanguageModelV2FunctionTool
      | LanguageModelV2ProviderDefinedTool
    )[],
    toolChoice?: Record<string, unknown> | string
  ) {
    if (!tools?.length) {
      return { tools: undefined, tool_choice: undefined }
    }

    const mappedTools = tools.map((tool) => {
      if (isFunctionTool(tool)) {
        return {
          type: 'function' as const,
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema // v5 uses inputSchema
          }
        }
      }

      return {
        type: 'function' as const,
        function: {
          name: tool.name
        }
      }
    })

    if (!toolChoice) {
      return { tools: mappedTools, tool_choice: undefined }
    }

    if (typeof toolChoice === 'string') {
      return { tools: mappedTools, tool_choice: toolChoice }
    }

    if (toolChoice.type === 'tool') {
      return {
        tools: mappedTools,
        tool_choice: {
          type: 'function',
          function: {
            name: toolChoice.toolName
          }
        }
      }
    }

    return { tools: mappedTools, tool_choice: undefined }
  }

  async doGenerate(options: LanguageModelV2CallOptions) {
    const args = this.getArgs(options)

    const { responseHeaders, value: response } = await postJsonToApi({
      url: this.config.url({
        path: '/chat/completions',
        modelId: this.modelId
      }),
      headers: combineHeaders(this.config.headers(), options.headers),
      body: args,
      failedResponseHandler: openrouterFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        OpenRouterChatCompletionResponseSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    })

    const { messages: rawPrompt, ...rawSettings } = args
    const responseData = response as Record<string, unknown>
    const choices = responseData.choices as Record<string, unknown>[]
    const choice = choices?.[0]

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

    // Build tool calls in v2 format
    const choiceMessage = choice?.message as Record<string, unknown>
    const toolCallsData = choiceMessage?.tool_calls as
      | Record<string, unknown>[]
      | undefined
    const toolCalls = toolCallsData?.map(
      (toolCall: Record<string, unknown>) => {
        const functionData = toolCall.function as Record<string, unknown>
        return {
          toolCallId: (toolCall.id as string) ?? generateId(),
          toolName: functionData.name as string,
          input: functionData.arguments as string // v2 uses 'input'
        }
      }
    )

    // Build content array in v2 format
    const content = []

    // Add text content
    const text = (choiceMessage?.content as string) ?? undefined
    if (text) {
      content.push({
        type: 'text' as const,
        text
      })
    }

    // Add reasoning content
    if (choiceMessage?.reasoning) {
      content.push({
        type: 'reasoning' as const,
        text: choiceMessage.reasoning as string
      })
    }

    // Add tool calls to content
    if (toolCalls && toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        content.push({
          type: 'tool-call' as const,
          toolCallType: 'function' as const,
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
          input: toolCall.input
        })
      }
    }

    return {
      content,
      finishReason: this.mapFinishReason(choice?.finish_reason as string),
      usage: validateUsageAccounting(usage),
      request: { body: { ...rawSettings, messages: rawPrompt } },
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
        path: '/chat/completions',
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
        OpenRouterStreamChatCompletionChunkSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    })

    const { messages: rawPrompt, ...rawSettings } = args

    // Store reference to mapFinishReason method for transformer context
    const mapFinishReason = this.mapFinishReason.bind(this)

    // Track streaming state for proper three-phase streaming
    let currentTextId: string | null = null
    let currentReasoningId: string | null = null

    return {
      stream: (response as ReadableStream).pipeThrough(
        new TransformStream<
          ParseResult<
            z.infer<typeof OpenRouterStreamChatCompletionChunkSchema>
          >,
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

            const delta = choice.delta
            if (!delta) return

            // Handle text content streaming - v5 three-phase pattern
            if (delta.content) {
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
                delta: delta.content
              })
            }

            // Handle tool calls streaming - v5 spec
            if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
              for (const toolCall of delta.tool_calls) {
                controller.enqueue({
                  type: 'tool-input-delta',
                  id: toolCall.id ?? generateId(),
                  delta: toolCall.function?.arguments ?? ''
                })
              }
            }

            // Handle reasoning streaming - v5 three-phase pattern
            if (delta.reasoning) {
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
                delta: delta.reasoning
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
      request: { body: { ...rawSettings, messages: rawPrompt } },
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
      case 'tool_calls':
        return 'tool-calls'
      case 'content_filter':
        return 'content-filter'
      default:
        return 'other'
    }
  }
}

// Schemas for response validation
const OpenRouterChatCompletionResponseSchema = z.object({
  id: z.string().optional(),
  model: z.string().optional(),
  choices: z.array(
    z.object({
      message: z.object({
        role: z.literal('assistant'),
        content: z.string().nullable().optional(),
        reasoning: z.string().nullable().optional(),
        tool_calls: z
          .array(
            z.object({
              id: z.string().optional().nullable(),
              type: z.literal('function'),
              function: z.object({
                name: z.string(),
                arguments: z.string()
              })
            })
          )
          .optional()
      }),
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

const OpenRouterStreamChatCompletionChunkSchema = z.union([
  z.object({
    id: z.string().optional(),
    model: z.string().optional(),
    choices: z.array(
      z.object({
        delta: z
          .object({
            role: z.enum(['assistant']).optional(),
            content: z.string().nullish(),
            reasoning: z.string().nullish().optional(),
            tool_calls: z
              .array(
                z.object({
                  index: z.number(),
                  id: z.string().nullish(),
                  type: z.literal('function').optional(),
                  function: z.object({
                    name: z.string().nullish(),
                    arguments: z.string().nullish()
                  })
                })
              )
              .nullish()
          })
          .nullish(),
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
