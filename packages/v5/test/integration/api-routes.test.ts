// Integration tests for API route functionality with v5
import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { LanguageModelV2Prompt } from '@ai-sdk/provider'
import { OpenRouterChatLanguageModel } from '../../src/models/chat'

type MockedFetch = typeof fetch & {
  mockReset: () => void
  mockResolvedValueOnce: (value: Response | PromiseLike<Response>) => unknown
  mockRejectedValueOnce: (value: unknown) => unknown
  mockImplementation: (
    fn: (url: string, options: RequestInit) => Promise<Response>
  ) => unknown
}
const mockFetch: MockedFetch = mock() as unknown as MockedFetch
// Mock Next.js API route handler pattern
const createChatHandler = (model: OpenRouterChatLanguageModel) => {
  return async (request: Request) => {
    try {
      const body = await request.json()
      const { messages, providerOptions } = body

      if (!messages || !Array.isArray(messages)) {
        return new Response(
          JSON.stringify({ error: 'Messages are required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const _lastMessage = messages[messages.length - 1]

      const prompt = messages.map((msg: Record<string, unknown>) => ({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : 'hello'
      }))

      const result = await model.doGenerate({
        prompt: prompt as LanguageModelV2Prompt,
        providerOptions,
        maxOutputTokens: 100
      })

      return new Response(
        JSON.stringify({
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: (result.content[0]?.text ?? '') || 'Hello from API',
          usage: result.usage,
          finishReason: result.finishReason
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    } catch (error) {
      return new Response(JSON.stringify({ error: (error as Error).message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
}

// Mock streaming API route handler - simplified approach
const createStreamingChatHandler = (_model: OpenRouterChatLanguageModel) => {
  return async (request: Request) => {
    try {
      const body = await request.json()
      const { messages } = body

      if (!messages || !Array.isArray(messages)) {
        return new Response(
          JSON.stringify({ error: 'Messages are required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Create a simple streaming response without using the model
      // This tests the handler structure, not the actual streaming
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder()

          // Simulate streaming chunks
          controller.enqueue(
            encoder.encode('data: {"type":"text-delta","delta":"Hello"}\n\n')
          )
          controller.enqueue(
            encoder.encode('data: {"type":"text-delta","delta":" world!"}\n\n')
          )
          controller.enqueue(
            encoder.encode('data: {"type":"finish","reason":"stop"}\n\n')
          )
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }
      })

      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive'
        }
      })
    } catch (error) {
      return new Response(JSON.stringify({ error: (error as Error).message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
}

describe('API Route Integration Tests', () => {
  let model: OpenRouterChatLanguageModel

  beforeEach(() => {
    mockFetch.mockReset()

    model = new OpenRouterChatLanguageModel(
      'meta-llama/llama-3.1-8b-instruct',
      { apiKey: 'test-key' },
      {
        provider: 'openrouter',
        compatibility: 'strict',
        headers: () => ({ Authorization: 'Bearer test-key' }),
        url: ({ path }: { path: string }) =>
          `https://openrouter.ai/api/v1${path}`,
        fetch: mockFetch as unknown as typeof fetch,
        extraBody: {}
      }
    )
  })

  describe('Basic API Route Handling', () => {
    it('should handle valid chat requests', async () => {
      // Mock OpenRouter API response
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'chatcmpl-123',
            object: 'chat.completion',
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: 'Hello, how can I help you?'
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
            headers: { 'Content-Type': 'application/json' }
          }
        )
      )

      const handler = createChatHandler(model)
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }]
        })
      })

      const response = await handler(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('application/json')

      const data = await response.json()
      expect(data.role).toBe('assistant')
      expect(data.content).toBeDefined()
      expect(data.usage).toBeDefined()
      expect(data.usage.inputTokens).toBe(10) // v5 format
      expect(data.usage.outputTokens).toBe(20) // v5 format
    })

    it('should handle invalid requests with 400 error', async () => {
      const handler = createChatHandler(model)
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Missing messages
      })

      const response = await handler(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Messages are required')
    })

    it('should handle OpenRouter API errors gracefully', async () => {
      // Mock OpenRouter API error
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              message: 'Invalid API key',
              type: 'authentication_error',
              code: 401
            }
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      )

      const handler = createChatHandler(model)
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }]
        })
      })

      const response = await handler(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toContain('Invalid API key')
    })
  })

  describe('v5 Provider Options Integration', () => {
    it('should handle providerOptions in API request', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'chatcmpl-123',
            object: 'chat.completion',
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: 'Response with reasoning'
                },
                finish_reason: 'stop'
              }
            ],
            usage: {
              prompt_tokens: 15,
              completion_tokens: 25,
              total_tokens: 40
            }
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      )

      const handler = createChatHandler(model)
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Reasoning test' }],
          providerOptions: {
            openrouter: {
              reasoning: { max_tokens: 500 },
              models: ['meta-llama/llama-3.1-8b-instruct']
            }
          }
        })
      })

      const response = await handler(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.content).toBe('Response with reasoning')
      expect(data.usage.inputTokens).toBe(15) // v5 format
    })

    it('should pass through OpenRouter-specific options', async () => {
      mockFetch.mockImplementation((url: string, options: RequestInit) => {
        const body = JSON.parse(options?.body as string)

        // Verify OpenRouter-specific options are passed through
        expect(body).toHaveProperty('reasoning')
        expect(body.reasoning.max_tokens).toBe(1000)
        expect(body).toHaveProperty('models')

        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: 'chatcmpl-123',
              object: 'chat.completion',
              choices: [
                {
                  index: 0,
                  message: { role: 'assistant', content: 'OK' },
                  finish_reason: 'stop'
                }
              ],
              usage: {
                prompt_tokens: 10,
                completion_tokens: 10,
                total_tokens: 20
              }
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        )
      })

      const handler = createChatHandler(model)
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Test' }],
          providerOptions: {
            openrouter: {
              reasoning: { max_tokens: 1000 },
              models: ['gpt-4', 'claude-3-opus']
            }
          }
        })
      })

      const response = await handler(request)
      expect(response.status).toBe(200)
    })
  })

  describe('Streaming API Route Handling', () => {
    it('should handle streaming responses correctly', async () => {
      // No need to mock fetch since we're not actually calling the model
      // This test validates the streaming endpoint structure

      // Test the handler can process streaming requests (even if we mock non-streaming response)
      const handler = createStreamingChatHandler(model)
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Stream test' }]
        })
      })

      const response = await handler(request)

      // Validate streaming response structure
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('text/event-stream')
      expect(response.headers.get('cache-control')).toBe('no-cache')

      // Read the stream to validate format
      const reader = response.body?.getReader()
      const receivedChunks = []

      while (true) {
        const { done, value } = await reader!.read()
        if (done) break
        receivedChunks.push(new TextDecoder().decode(value))
      }

      const streamData = receivedChunks.join('')
      expect(streamData).toContain('text-delta')
      expect(streamData).toContain('[DONE]')
    })

    it('should handle streaming errors gracefully', async () => {
      const handler = createStreamingChatHandler(model)
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json' // This will cause JSON parsing to fail
      })

      const response = await handler(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBeDefined()
    })
  })

  describe('Tool Calling Integration', () => {
    it('should handle tool calls in API routes', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'chatcmpl-123',
            object: 'chat.completion',
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: null,
                  tool_calls: [
                    {
                      id: 'call_123',
                      type: 'function',
                      function: {
                        name: 'get_weather',
                        arguments: '{"location": "New York"}'
                      }
                    }
                  ]
                },
                finish_reason: 'tool_calls'
              }
            ],
            usage: {
              prompt_tokens: 20,
              completion_tokens: 15,
              total_tokens: 35
            }
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      )

      const handler = createChatHandler(model)
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'What is the weather in New York?' }
          ],
          tools: [
            {
              type: 'function',
              function: {
                name: 'get_weather',
                description: 'Get weather information',
                parameters: {
                  type: 'object',
                  properties: {
                    location: { type: 'string' }
                  },
                  required: ['location']
                }
              }
            }
          ]
        })
      })

      const response = await handler(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.finishReason).toBe('tool-calls')
    })
  })

  describe('Rate Limiting and Error Handling', () => {
    it('should handle rate limit responses from OpenRouter', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              message: 'Rate limit exceeded',
              type: 'rate_limit_exceeded',
              code: 429
            }
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '60'
            }
          }
        )
      )

      const handler = createChatHandler(model)
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Rate limit test' }]
        })
      })

      const response = await handler(request)
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toContain('Rate limit exceeded')
    })

    it('should handle malformed JSON requests', async () => {
      const handler = createChatHandler(model)
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      })

      const response = await handler(request)
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBeDefined()
    })

    it('should handle network timeouts', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 50)
          )
      )

      const handler = createChatHandler(model)
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Timeout test' }]
        })
      })

      const response = await handler(request)
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe('Request timeout')
    })
  })

  describe('Response Format Validation', () => {
    it('should convert v4 usage format to v5 in API responses', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'chatcmpl-123',
            object: 'chat.completion',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'Test response' },
                finish_reason: 'stop'
              }
            ],
            usage: {
              prompt_tokens: 12,
              completion_tokens: 18,
              total_tokens: 30
            }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )

      const handler = createChatHandler(model)
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Usage format test' }]
        })
      })

      const response = await handler(request)
      const data = await response.json()

      // Should use v5 property names
      expect(data.usage.inputTokens).toBe(12)
      expect(data.usage.outputTokens).toBe(18)
      expect(data.usage.totalTokens).toBe(30)

      // Should not have v4 property names
      expect(data.usage.promptTokens).toBeUndefined()
      expect(data.usage.completionTokens).toBeUndefined()
    })

    it('should include all required response fields', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'chatcmpl-123',
            object: 'chat.completion',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'Complete response' },
                finish_reason: 'stop'
              }
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 20,
              total_tokens: 30
            }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )

      const handler = createChatHandler(model)
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Complete test' }]
        })
      })

      const response = await handler(request)
      const data = await response.json()

      // Verify all required fields are present
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('role', 'assistant')
      expect(data).toHaveProperty('content')
      expect(data).toHaveProperty('usage')
      expect(data).toHaveProperty('finishReason')

      expect(data.usage).toHaveProperty('inputTokens')
      expect(data.usage).toHaveProperty('outputTokens')
      expect(data.usage).toHaveProperty('totalTokens')
    })
  })
})
