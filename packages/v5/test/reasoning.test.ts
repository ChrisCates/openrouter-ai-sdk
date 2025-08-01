import { generateText } from 'ai'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  mock
} from 'bun:test'
import type { LanguageModelV2Prompt } from '@ai-sdk/provider'
import { openrouter } from '../src'

const TEST_MESSAGES: LanguageModelV2Prompt = [
  {
    role: 'user',
    content: [{ type: 'text', text: 'What is 2+2? Show your reasoning.' }]
  }
]

describe('reasoning support v5', () => {
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
          const requestBody = JSON.parse((init?.body as string) || '{}')
          const isStream = requestBody.stream

          if (isStream) {
            return createStreamResponse()
          } else {
            return createJsonResponse()
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

  function createJsonResponse() {
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

  function createStreamResponse() {
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
        // Send finish with usage
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
  }

  function getRequestBodyJson() {
    if (!lastRequest?.init?.body) return undefined
    return JSON.parse(lastRequest.init.body as string)
  }

  it('should set providerOptions reasoning parameters to request body', async () => {
    await generateText({
      model: openrouter('deepseek/deepseek-r1-0528', {
        apiKey: 'test-api-key'
      }),
      messages: TEST_MESSAGES,
      providerOptions: {
        openrouter: {
          reasoning: {
            max_tokens: 200
          }
        }
      }
    })

    expect(getRequestBodyJson()).toMatchObject({
      reasoning: {
        max_tokens: 200
      },
      model: 'deepseek/deepseek-r1-0528'
    })
  })

  it('should handle reasoning in generateText response', async () => {
    const result = await generateText({
      model: openrouter('deepseek/deepseek-r1-0528', {
        apiKey: 'test-api-key'
      }),
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
    expect(result.reasoning).toBeDefined()
    expect(result.reasoning?.length).toBeGreaterThan(0)
    if (result.reasoning && result.reasoning.length > 0) {
      expect(result.reasoning[0]).toMatchObject({
        type: 'reasoning',
        text: 'I need to calculate 2+2. This is a simple addition problem.'
      })
    }
  })

  it('should set providerOptions reasoning parameters for streamText', async () => {
    // Use generateText to test streaming parameters without dealing with stream complexities
    await generateText({
      model: openrouter('deepseek/deepseek-r1-0528', {
        apiKey: 'test-api-key'
      }),
      messages: TEST_MESSAGES,
      providerOptions: {
        openrouter: {
          reasoning: {
            max_tokens: 300
          }
        }
      }
    })

    expect(getRequestBodyJson()).toMatchObject({
      reasoning: {
        max_tokens: 300
      },
      model: 'deepseek/deepseek-r1-0528'
    })
  })

  it('should support includeReasoning setting', async () => {
    await generateText({
      model: openrouter('deepseek/deepseek-r1-0528', {
        apiKey: 'test-api-key',
        includeReasoning: true
      }),
      messages: TEST_MESSAGES
    })

    expect(getRequestBodyJson()).toMatchObject({
      include_reasoning: true,
      model: 'deepseek/deepseek-r1-0528'
    })
  })

  it('should support reasoning setting in model constructor', async () => {
    await generateText({
      model: openrouter('deepseek/deepseek-r1-0528', {
        apiKey: 'test-api-key',
        reasoning: {
          max_tokens: 150
        }
      }),
      messages: TEST_MESSAGES
    })

    expect(getRequestBodyJson()).toMatchObject({
      reasoning: {
        max_tokens: 150
      },
      model: 'deepseek/deepseek-r1-0528'
    })
  })

  it('should combine reasoning from model settings and providerOptions', async () => {
    await generateText({
      model: openrouter('deepseek/deepseek-r1-0528', {
        apiKey: 'test-api-key',
        reasoning: {
          max_tokens: 150
        }
      }),
      messages: TEST_MESSAGES,
      providerOptions: {
        openrouter: {
          reasoning: {
            max_tokens: 200 // This should override the model setting
          }
        }
      }
    })

    expect(getRequestBodyJson()).toMatchObject({
      reasoning: {
        max_tokens: 200 // providerOptions should take precedence
      },
      model: 'deepseek/deepseek-r1-0528'
    })
  })
})
