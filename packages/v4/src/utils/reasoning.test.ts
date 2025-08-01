import { generateText, streamText } from 'ai'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  mock
} from 'bun:test'
import type { LanguageModelV1Prompt } from '@ai-sdk/provider'
import { createOpenRouter } from '../provider'

const TEST_MESSAGES: LanguageModelV1Prompt = [
  {
    role: 'user',
    content: [{ type: 'text', text: 'What is 2+2? Show your reasoning.' }]
  }
]

describe('reasoning support v4', () => {
  let mockFetch: Mock<typeof fetch>
  let lastRequest: { url: string; init?: RequestInit } | null = null
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    lastRequest = null

    mockFetch = mock(
      async (url: string | Request | URL, init?: RequestInit) => {
        const urlString = url.toString()
        lastRequest = { url: urlString, init }

        if (urlString.includes('openrouter.ai/api/v1/chat/completions')) {
          // Return a mock response with reasoning content
          const isStream = JSON.parse((init?.body as string) || '{}').stream

          if (isStream) {
            // Return a streaming response with reasoning
            const stream = new ReadableStream({
              start(controller) {
                // Send reasoning delta
                controller.enqueue(
                  new TextEncoder().encode(
                    'data: {"id":"chatcmpl-test","object":"chat.completion.chunk","created":1711363606,"model":"deepseek/deepseek-r1-0528","choices":[{"index":0,"delta":{"reasoning":"I need to calculate 2+2. This is a simple addition problem."},"finish_reason":null}]}\n\n'
                  )
                )
                // Send text delta
                controller.enqueue(
                  new TextEncoder().encode(
                    'data: {"id":"chatcmpl-test","object":"chat.completion.chunk","created":1711363606,"model":"deepseek/deepseek-r1-0528","choices":[{"index":0,"delta":{"content":"The answer is 4."},"finish_reason":null}]}\n\n'
                  )
                )
                // Send finish
                controller.enqueue(
                  new TextEncoder().encode(
                    'data: {"id":"chatcmpl-test","object":"chat.completion.chunk","created":1711363606,"model":"deepseek/deepseek-r1-0528","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":20,"total_tokens":30}}\n\n'
                  )
                )
                controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
                controller.close()
              }
            })

            return new Response(stream, {
              status: 200,
              headers: {
                'content-type': 'text/event-stream',
                'cache-control': 'no-cache',
                connection: 'keep-alive'
              }
            })
          } else {
            // Return a non-streaming response with reasoning
            return new Response(
              JSON.stringify({
                id: 'chatcmpl-test',
                object: 'chat.completion',
                created: 1711363606,
                model: 'deepseek/deepseek-r1-0528',
                choices: [
                  {
                    index: 0,
                    message: {
                      role: 'assistant',
                      content: 'The answer is 4.',
                      reasoning:
                        'I need to calculate 2+2. This is a simple addition problem.'
                    },
                    finish_reason: 'stop'
                  }
                ],
                usage: {
                  prompt_tokens: 10,
                  completion_tokens: 20,
                  total_tokens: 30
                }
              }),
              {
                status: 200,
                headers: { 'content-type': 'application/json' }
              }
            )
          }
        }

        return originalFetch(url, init)
      }
    ) as Mock<typeof fetch>

    globalThis.fetch = mockFetch as unknown as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  function getRequestBodyJson() {
    if (!lastRequest?.init?.body) return undefined
    return JSON.parse(lastRequest.init.body as string)
  }

  it('should set providerOptions reasoning parameters to request body', async () => {
    const openrouter = createOpenRouter({
      apiKey: 'test-api-key'
    })
    const model = openrouter('deepseek/deepseek-r1-0528')

    await streamText({
      model,
      messages: TEST_MESSAGES,
      providerOptions: {
        openrouter: {
          reasoning: {
            max_tokens: 200
          }
        }
      }
    }).consumeStream()

    expect(getRequestBodyJson()).toStrictEqual({
      messages: [
        {
          content: 'What is 2+2? Show your reasoning.',
          role: 'user'
        }
      ],
      reasoning: {
        max_tokens: 200
      },
      temperature: 0,
      model: 'deepseek/deepseek-r1-0528',
      stream: true
    })
  })

  it('should handle reasoning in generateText response', async () => {
    const openrouter = createOpenRouter({
      apiKey: 'test-api-key'
    })
    const model = openrouter('deepseek/deepseek-r1-0528')

    const result = await generateText({
      model,
      messages: TEST_MESSAGES,
      providerOptions: {
        openrouter: {
          reasoning: {
            max_tokens: 200
          }
        }
      }
    })

    expect(result.text).toBe('The answer is 4.')

    // AI SDK v4 exposes reasoning in multiple formats
    expect(result.reasoning).toBe(
      'I need to calculate 2+2. This is a simple addition problem.'
    )
    expect(result.reasoningDetails).toBeDefined()
    expect(result.reasoningDetails?.length).toBeGreaterThan(0)
    if (result.reasoningDetails && result.reasoningDetails.length > 0) {
      expect(result.reasoningDetails[0]).toMatchObject({
        type: 'text',
        text: 'I need to calculate 2+2. This is a simple addition problem.'
      })
    }

    // Check that reasoning appears in response messages as well
    expect(result.response.messages).toBeDefined()
    expect(result.response.messages.length).toBeGreaterThan(0)
    const assistantMessage = result.response.messages[0]
    expect(assistantMessage.role).toBe('assistant')
    expect(assistantMessage.content).toBeDefined()

    // Check for reasoning content part
    const reasoningPart = Array.isArray(assistantMessage.content)
      ? assistantMessage.content.find(
          (part: { type: string }) => part.type === 'reasoning'
        )
      : undefined
    expect(reasoningPart).toBeDefined()

    // Type assertion after checking that reasoningPart exists and has correct type
    if (reasoningPart && 'text' in reasoningPart) {
      expect((reasoningPart as { text: string }).text).toBe(
        'I need to calculate 2+2. This is a simple addition problem.'
      )
    }
  })

  it('should handle reasoning in streamText response', async () => {
    const openrouter = createOpenRouter({
      apiKey: 'test-api-key'
    })
    const model = openrouter('deepseek/deepseek-r1-0528')

    const result = streamText({
      model,
      messages: TEST_MESSAGES,
      providerOptions: {
        openrouter: {
          reasoning: {
            max_tokens: 200
          }
        }
      }
    })

    // Consume the stream
    let fullText = ''
    for await (const delta of result.textStream) {
      fullText += delta
    }

    expect(fullText).toBe('The answer is 4.')

    // Check usage
    const usage = await result.usage
    expect(usage.promptTokens).toBe(10)
    expect(usage.completionTokens).toBe(20)
    expect(usage.totalTokens).toBe(30)
  })

  it('should support includeReasoning setting', async () => {
    const openrouter = createOpenRouter({
      apiKey: 'test-api-key'
    })
    const model = openrouter('deepseek/deepseek-r1-0528', {
      includeReasoning: true
    })

    await generateText({
      model,
      messages: TEST_MESSAGES
    })

    expect(getRequestBodyJson()).toMatchObject({
      include_reasoning: true,
      model: 'deepseek/deepseek-r1-0528'
    })
  })

  it('should support reasoning setting in model constructor', async () => {
    const openrouter = createOpenRouter({
      apiKey: 'test-api-key'
    })
    const model = openrouter('deepseek/deepseek-r1-0528', {
      reasoning: {
        max_tokens: 150
      }
    })

    await generateText({
      model,
      messages: TEST_MESSAGES
    })

    expect(getRequestBodyJson()).toMatchObject({
      reasoning: {
        max_tokens: 150
      },
      model: 'deepseek/deepseek-r1-0528'
    })
  })
})
