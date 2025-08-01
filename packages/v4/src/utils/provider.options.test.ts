import { streamText } from 'ai'
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
  { role: 'user', content: [{ type: 'text', text: 'Hello' }] }
]

describe('providerOptions', () => {
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
          // Return a streaming response with empty chunks for this test
          const stream = new ReadableStream({
            start(controller) {
              // Send an empty delta to complete the stream
              controller.enqueue(
                new TextEncoder().encode(
                  'data: {"id":"chatcmpl-test","object":"chat.completion.chunk","created":1711363606,"model":"anthropic/claude-3.7-sonnet","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":1,"completion_tokens":1,"total_tokens":2}}\\n\\n'
                )
              )
              controller.enqueue(new TextEncoder().encode('data: [DONE]\\n\\n'))
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

  it('should set providerOptions openrouter to extra body', async () => {
    const openrouter = createOpenRouter({
      apiKey: 'test-api-key'
    })
    const model = openrouter('anthropic/claude-3.7-sonnet')

    await streamText({
      model,
      messages: TEST_MESSAGES,
      providerOptions: {
        openrouter: {
          reasoning: {
            max_tokens: 1000
          }
        }
      }
    }).consumeStream()

    expect(getRequestBodyJson()).toStrictEqual({
      messages: [
        {
          content: 'Hello',
          role: 'user'
        }
      ],
      reasoning: {
        max_tokens: 1000
      },
      temperature: 0,
      model: 'anthropic/claude-3.7-sonnet',
      stream: true
    })
  })
})
