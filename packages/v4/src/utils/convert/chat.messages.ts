import type {
  LanguageModelV1Prompt,
  LanguageModelV1ProviderMetadata
} from '@ai-sdk/provider'
import { convertUint8ArrayToBase64 } from '@ai-sdk/provider-utils'
import type { ReasoningDetailUnion } from '../../schemas/reasoning'
import { ReasoningDetailType } from '../../schemas/reasoning'
import type {
  ChatCompletionContentPart,
  OpenRouterChatCompletionsInput
} from '../../types/chat.completions'

// Type for OpenRouter Cache Control following Anthropic's pattern
export interface OpenRouterCacheControl {
  type: 'ephemeral'
}

function getCacheControl(
  providerMetadata: LanguageModelV1ProviderMetadata | undefined
): OpenRouterCacheControl | undefined {
  const anthropic = providerMetadata?.anthropic
  const openrouter = providerMetadata?.openrouter

  // Allow both cacheControl and cache_control:
  return (openrouter?.cacheControl ??
    openrouter?.cache_control ??
    anthropic?.cacheControl ??
    anthropic?.cache_control) as OpenRouterCacheControl | undefined
}

export function convertToOpenRouterChatMessages(
  prompt: LanguageModelV1Prompt
): OpenRouterChatCompletionsInput {
  const messages: OpenRouterChatCompletionsInput = []
  for (const { role, content, providerMetadata } of prompt) {
    switch (role) {
      case 'system': {
        messages.push({
          role: 'system',
          content,
          cache_control: getCacheControl(providerMetadata)
        })
        break
      }

      case 'user': {
        if (content.length === 1 && content[0]?.type === 'text') {
          const cacheControl =
            getCacheControl(providerMetadata) ??
            getCacheControl(content[0].providerMetadata)
          const contentWithCacheControl: string | ChatCompletionContentPart[] =
            cacheControl
              ? [
                  {
                    type: 'text',
                    text: content[0].text,
                    cache_control: cacheControl
                  }
                ]
              : content[0].text
          messages.push({
            role: 'user',
            content: contentWithCacheControl
          })
          break
        }

        // Get message level cache control
        const messageCacheControl = getCacheControl(providerMetadata)
        const contentParts: ChatCompletionContentPart[] = content.map(
          (part) => {
            const cacheControl =
              getCacheControl(part.providerMetadata) ?? messageCacheControl

            switch (part.type) {
              case 'text':
                return {
                  type: 'text' as const,
                  text: part.text,
                  // For text parts, only use part-specific cache control
                  cache_control: cacheControl
                }
              case 'image':
                return {
                  type: 'image_url' as const,
                  image_url: {
                    url:
                      part.image instanceof URL
                        ? part.image.toString()
                        : `data:${part.mimeType ?? 'image/jpeg'};base64,${convertUint8ArrayToBase64(
                            part.image
                          )}`
                  },
                  // For image parts, use part-specific or message-level cache control
                  cache_control: cacheControl
                }
              case 'file':
                return {
                  type: 'file' as const,
                  file: {
                    filename: String(
                      part.providerMetadata?.openrouter?.filename ??
                        part.filename ??
                        ''
                    ),
                    file_data:
                      part.data instanceof Uint8Array
                        ? `data:${part.mimeType};base64,${convertUint8ArrayToBase64(part.data)}`
                        : `data:${part.mimeType};base64,${part.data}`
                  },
                  cache_control: cacheControl
                }
              default: {
                const _exhaustiveCheck: never = part
                throw new Error(
                  `Unsupported content part type: ${_exhaustiveCheck}`
                )
              }
            }
          }
        )

        // For multi-part messages, don't add cache_control at the root level
        messages.push({
          role: 'user',
          content: contentParts
        })

        break
      }

      case 'assistant': {
        let text = ''
        let reasoning = ''
        const reasoningDetails: ReasoningDetailUnion[] = []
        const toolCalls: {
          id: string
          type: 'function'
          function: { name: string; arguments: string }
        }[] = []

        for (const part of content) {
          switch (part.type) {
            case 'text': {
              text += part.text
              break
            }
            case 'tool-call': {
              toolCalls.push({
                id: part.toolCallId,
                type: 'function',
                function: {
                  name: part.toolName,
                  arguments: JSON.stringify(part.args)
                }
              })
              break
            }
            case 'reasoning': {
              reasoning += part.text
              reasoningDetails.push({
                type: ReasoningDetailType.Text,
                text: part.text,
                signature: part.signature
              })

              break
            }
            case 'redacted-reasoning': {
              reasoningDetails.push({
                type: ReasoningDetailType.Encrypted,
                data: part.data
              })
              break
            }
            case 'file':
              break
            default: {
              const _exhaustiveCheck: never = part
              throw new Error(`Unsupported part: ${_exhaustiveCheck}`)
            }
          }
        }

        messages.push({
          role: 'assistant',
          content: text,
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
          reasoning: reasoning || undefined,
          reasoning_details:
            reasoningDetails.length > 0 ? reasoningDetails : undefined,
          cache_control: getCacheControl(providerMetadata)
        })

        break
      }

      case 'tool': {
        for (const toolResponse of content) {
          messages.push({
            role: 'tool',
            tool_call_id: toolResponse.toolCallId,
            content: JSON.stringify(toolResponse.result),
            cache_control:
              getCacheControl(providerMetadata) ??
              getCacheControl(toolResponse.providerMetadata)
          })
        }
        break
      }

      default: {
        const _exhaustiveCheck: never = role
        throw new Error(`Unsupported role: ${_exhaustiveCheck}`)
      }
    }
  }

  return messages
}
