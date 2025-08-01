// Edge Runtime compatibility tests for v5
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { OpenRouterChatLanguageModel } from '../../src/models/chat'

const mockFetch = mock()

// Create a more realistic mock for streaming responses
const createStreamingMock = (chunks: Record<string, unknown>[]) => {
  const sseData =
    chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join('') +
    'data: [DONE]\n\n'

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      controller.enqueue(encoder.encode(sseData))
      controller.close()
    }
  })

  // Create a more detailed Response mock
  const response = {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }),
    body: stream,
    json: async () => ({}),
    text: async () => sseData,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    clone: () => response
  }

  return response
}

// Mock Edge Runtime environment
const mockEdgeRuntime = () => {
  // Store original globals to restore later
  const originalGlobals = {
    EdgeRuntime: (global as Record<string, unknown>).EdgeRuntime ?? undefined,
    process: (global as Record<string, unknown>).process ?? undefined,
    Buffer: (global as Record<string, unknown>).Buffer ?? undefined,
    __dirname: (global as Record<string, unknown>).__dirname ?? undefined,
    __filename: (global as Record<string, unknown>).__filename ?? undefined,
    fetch: (global as Record<string, unknown>).fetch ?? undefined
  }

  // Set Edge Runtime globals
  ;(global as Record<string, unknown>).EdgeRuntime = '1.0'
  ;(global as Record<string, unknown>).fetch = mockFetch

  // Provide minimal Buffer polyfill for Edge Runtime compatibility
  // In real Edge Runtime, this would be handled by the runtime itself
  ;(global as Record<string, unknown>).Buffer = {
    from: (data: string | Uint8Array) =>
      new Uint8Array(
        typeof data === 'string' ? new TextEncoder().encode(data) : data
      ),
    isBuffer: () => false
  }

  // Remove other Node.js specific globals that aren't available in Edge Runtime
  if ('process' in global) delete (global as Record<string, unknown>).process
  if ('__dirname' in global)
    delete (global as Record<string, unknown>).__dirname
  if ('__filename' in global)
    delete (global as Record<string, unknown>).__filename

  return () => {
    // Restore original globals
    if (originalGlobals.EdgeRuntime !== undefined) {
      ;(global as Record<string, unknown>).EdgeRuntime =
        originalGlobals.EdgeRuntime
    } else {
      delete (global as Record<string, unknown>).EdgeRuntime
    }

    if (originalGlobals.process !== undefined) {
      ;(global as Record<string, unknown>).process = originalGlobals.process
    }

    if (originalGlobals.Buffer !== undefined) {
      ;(global as Record<string, unknown>).Buffer = originalGlobals.Buffer
    }

    if (originalGlobals.__dirname !== undefined) {
      ;(global as Record<string, unknown>).__dirname = originalGlobals.__dirname
    }

    if (originalGlobals.__filename !== undefined) {
      ;(global as Record<string, unknown>).__filename =
        originalGlobals.__filename
    }

    if (originalGlobals.fetch !== undefined) {
      ;(global as Record<string, unknown>).fetch = originalGlobals.fetch
    }
  }
}

describe('Edge Runtime Compatibility Tests', () => {
  let model: OpenRouterChatLanguageModel
  let restoreGlobals: () => void

  beforeEach(() => {
    mockFetch.mockReset()
    restoreGlobals = mockEdgeRuntime()

    model = new OpenRouterChatLanguageModel(
      'meta-llama/llama-3.1-8b-instruct',
      { apiKey: 'test-key' },
      {
        provider: 'openrouter',
        compatibility: 'strict',
        headers: () => ({ Authorization: 'Bearer test-key' }),
        url: ({ path }: { path: string }) =>
          `https://openrouter.ai/api/v1${path}`,
        fetch: mockFetch,
        extraBody: {}
      }
    )
  })

  afterEach(() => {
    restoreGlobals()
  })

  describe('Basic Edge Runtime Compatibility', () => {
    it('should work in Edge Runtime environment', async () => {
      // Verify Edge Runtime environment is active
      expect((global as Record<string, unknown>).EdgeRuntime).toBe('1.0')
      expect((global as Record<string, unknown>).process).toBeUndefined()
      expect((global as Record<string, unknown>).__dirname).toBeUndefined()
      expect((global as Record<string, unknown>).__filename).toBeUndefined()
      // Buffer should be polyfilled in Edge Runtime
      expect((global as Record<string, unknown>).Buffer).toBeDefined()

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
                  content: 'Hello from Edge Runtime!'
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

      const result = await model.doGenerate({
        mode: { type: 'regular' },
        inputFormat: 'prompt',
        prompt: 'Hello from Edge!'
      })

      expect(result).toBeDefined()
      expect(result.text).toBe('Hello from Edge Runtime!')
      expect(result.usage.inputTokens).toBe(10) // v5 format
      expect(result.usage.outputTokens).toBe(20) // v5 format
    })

    it('should handle streaming in Edge Runtime', async () => {
      const streamChunks = [
        { type: 'text-delta', textDelta: 'Streaming' },
        { type: 'text-delta', textDelta: ' from Edge' },
        {
          type: 'finish',
          finishReason: 'stop',
          usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 }
        }
      ]

      mockFetch.mockResolvedValueOnce(createStreamingMock(streamChunks))

      const stream = await model.doStream({
        mode: { type: 'regular' },
        inputFormat: 'prompt',
        prompt: 'Stream test in Edge'
      })

      const chunks = []
      for await (const part of stream) {
        chunks.push(part)
      }

      expect(chunks.length).toBeGreaterThan(0)

      // Should have v5 streaming format
      const textParts = chunks.filter(
        (c) => c.type === 'text-start' || c.type === 'text-delta'
      )
      expect(textParts.length).toBeGreaterThan(0)
    })
  })

  describe('Web Standards Compatibility', () => {
    it('should only use Web API standards available in Edge Runtime', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'chatcmpl-123',
            object: 'chat.completion',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'Web standards test' },
                finish_reason: 'stop'
              }
            ],
            usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )

      // Test that model only uses Web APIs
      const result = await model.doGenerate({
        mode: { type: 'regular' },
        inputFormat: 'prompt',
        prompt: 'Test Web APIs'
      })

      // Should work without Node.js specific APIs
      expect(result).toBeDefined()
      expect(typeof result.text).toBe('string')

      // Verify fetch was called (Web API)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('openrouter.ai'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Object),
          body: expect.any(String)
        })
      )
    })

    it('should handle Headers, URL, and URLSearchParams (Web APIs)', async () => {
      // Test that model can work with Web API objects
      const headers = new Headers()
      headers.set('Authorization', 'Bearer test-key')
      headers.set('Content-Type', 'application/json')

      const url = new URL('https://openrouter.ai/api/v1/chat/completions')
      const searchParams = new URLSearchParams()
      searchParams.set('test', 'value')

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'chatcmpl-123',
            object: 'chat.completion',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'Web APIs work!' },
                finish_reason: 'stop'
              }
            ],
            usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 }
          }),
          { status: 200, headers }
        )
      )

      const result = await model.doGenerate({
        mode: { type: 'regular' },
        inputFormat: 'prompt',
        prompt: 'Web API test'
      })

      expect(result.text).toBe('Web APIs work!')
      expect(headers.get('Content-Type')).toBe('application/json')
      expect(url.hostname).toBe('openrouter.ai')
      expect(searchParams.get('test')).toBe('value')
    })

    it('should work with FormData and Blob (Edge Runtime Web APIs)', async () => {
      const formData = new FormData()
      formData.append('test', 'value')

      const blob = new Blob(['test data'], { type: 'text/plain' })

      mockFetch.mockResolvedValueOnce(
        new Response(blob, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        })
      )

      // Mock a simple request that uses FormData
      const response = await fetch('https://example.com', {
        method: 'POST',
        body: formData
      })

      expect(response).toBeDefined()
      expect(response.status).toBe(200)

      const text = await response.text()
      expect(text).toBe('test data')
    })
  })

  describe('JSON Handling in Edge Runtime', () => {
    it('should handle JSON parsing and stringifying', async () => {
      const testData = {
        messages: [{ role: 'user', content: 'Test JSON' }],
        providerOptions: {
          openrouter: {
            reasoning: { max_tokens: 500 }
          }
        }
      }

      // Test JSON.stringify
      const jsonString = JSON.stringify(testData)
      expect(typeof jsonString).toBe('string')
      expect(jsonString).toContain('Test JSON')

      // Test JSON.parse
      const parsedData = JSON.parse(jsonString)
      expect(parsedData.messages[0].content).toBe('Test JSON')
      expect(parsedData.providerOptions.openrouter.reasoning.max_tokens).toBe(
        500
      )

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
                  content: 'JSON handled correctly'
                },
                finish_reason: 'stop'
              }
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 15,
              total_tokens: 25
            }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )

      const result = await model.doGenerate({
        mode: { type: 'regular' },
        inputFormat: 'messages',
        prompt: testData.messages.map((msg) => ({
          role: msg.role,
          content: msg.content
        })),
        providerOptions: testData.providerOptions
      })

      expect(result.text).toBe('JSON handled correctly')
    })

    it('should handle malformed JSON gracefully', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response('invalid json{', {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      try {
        await model.doGenerate({
          mode: { type: 'regular' },
          inputFormat: 'prompt',
          prompt: 'Malformed JSON test'
        })
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined()
        expect((error as Error).message).toContain('JSON') // Should be a JSON parsing error
      }
    })
  })

  describe('Error Handling in Edge Runtime', () => {
    it('should handle network errors appropriately', async () => {
      mockFetch.mockRejectedValueOnce(
        new Error('Network error in Edge Runtime')
      )

      try {
        await model.doGenerate({
          mode: { type: 'regular' },
          inputFormat: 'prompt',
          prompt: 'Network error test'
        })
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect((error as Error).message).toBe('Network error in Edge Runtime')
      }
    })

    it('should handle HTTP errors correctly', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              message: 'Edge Runtime API error',
              type: 'invalid_request_error',
              code: 400
            }
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      )

      try {
        await model.doGenerate({
          mode: { type: 'regular' },
          inputFormat: 'prompt',
          prompt: 'HTTP error test'
        })
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect((error as Error).message).toContain(
          'Failed to process error response'
        )
      }
    })

    it('should handle timeout scenarios', async () => {
      // Mock a request that times out
      mockFetch.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Request timeout in Edge Runtime')),
              100
            )
          )
      )

      try {
        await model.doGenerate({
          mode: { type: 'regular' },
          inputFormat: 'prompt',
          prompt: 'Timeout test'
        })
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect((error as Error).message).toBe('Request timeout in Edge Runtime')
      }
    })
  })

  describe('Memory Management in Edge Runtime', () => {
    it('should handle large payloads efficiently', async () => {
      const largeContent = 'word '.repeat(10000) // Large string

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'chatcmpl-123',
            object: 'chat.completion',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: largeContent },
                finish_reason: 'stop'
              }
            ],
            usage: {
              prompt_tokens: 100,
              completion_tokens: 5000,
              total_tokens: 5100
            }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )

      const result = await model.doGenerate({
        mode: { type: 'regular' },
        inputFormat: 'prompt',
        prompt: 'Large response test'
      })

      expect(result.text).toBe(largeContent)
      expect(result.text.length).toBeGreaterThan(40000) // Should handle large content
    })

    it('should clean up resources properly', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'chatcmpl-123',
            object: 'chat.completion',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'Cleanup test' },
                finish_reason: 'stop'
              }
            ],
            usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )

      // Multiple requests to test resource cleanup
      for (let i = 0; i < 10; i++) {
        const result = await model.doGenerate({
          mode: { type: 'regular' },
          inputFormat: 'prompt',
          prompt: `Cleanup test ${i}`
        })
        expect(result.text).toBe('Cleanup test')
      }

      // Should complete without memory leaks or resource exhaustion
      expect(mockFetch).toHaveBeenCalledTimes(10)
    })
  })

  describe('Streaming in Edge Runtime', () => {
    it('should handle ReadableStream properly', async () => {
      const chunks = [
        { type: 'text-delta', textDelta: 'Edge' },
        { type: 'text-delta', textDelta: ' streaming' },
        {
          type: 'finish',
          finishReason: 'stop',
          usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 }
        }
      ]

      mockFetch.mockResolvedValueOnce(createStreamingMock(chunks))

      const resultStream = await model.doStream({
        mode: { type: 'regular' },
        inputFormat: 'prompt',
        prompt: 'Edge streaming test'
      })

      const collectedChunks = []
      for await (const part of resultStream) {
        collectedChunks.push(part)
      }

      expect(collectedChunks.length).toBeGreaterThan(0)

      // Should have proper v5 streaming format
      const textDeltas = collectedChunks.filter((c) => c.type === 'text-delta')
      expect(textDeltas.length).toBeGreaterThan(0)
    })

    it('should handle stream errors in Edge Runtime', async () => {
      // Mock a streaming error by rejecting the fetch
      mockFetch.mockRejectedValueOnce(new Error('Stream error in Edge Runtime'))

      try {
        await model.doStream({
          mode: { type: 'regular' },
          inputFormat: 'prompt',
          prompt: 'Stream error test'
        })
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect((error as Error).message).toBe('Stream error in Edge Runtime')
      }
    })
  })

  describe('v5 Feature Compatibility in Edge Runtime', () => {
    it('should handle v5 provider options in Edge Runtime', async () => {
      mockFetch.mockImplementation((_url, options) => {
        const body = JSON.parse(options?.body as string)

        // Verify v5 provider options are handled correctly
        expect(body).toHaveProperty('reasoning')
        expect(body.reasoning.max_tokens).toBe(1000)

        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: 'chatcmpl-123',
              object: 'chat.completion',
              choices: [
                {
                  index: 0,
                  message: {
                    role: 'assistant',
                    content: 'v5 options work in Edge Runtime'
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
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        )
      })

      const result = await model.doGenerate({
        mode: { type: 'regular' },
        inputFormat: 'prompt',
        prompt: 'v5 provider options test',
        providerOptions: {
          openrouter: {
            reasoning: { max_tokens: 1000 }
          }
        }
      })

      expect(result.text).toBe('v5 options work in Edge Runtime')
    })

    it('should convert usage format to v5 in Edge Runtime', async () => {
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
                  content: 'Usage conversion test'
                },
                finish_reason: 'stop'
              }
            ],
            usage: {
              prompt_tokens: 12, // v4 format
              completion_tokens: 18, // v4 format
              total_tokens: 30
            }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )

      const result = await model.doGenerate({
        mode: { type: 'regular' },
        inputFormat: 'prompt',
        prompt: 'Usage format test'
      })

      // Should convert to v5 format
      expect(result.usage.inputTokens).toBe(12)
      expect(result.usage.outputTokens).toBe(18)
      expect(result.usage.totalTokens).toBe(30)

      // Should not have v4 properties
      expect(result.usage.promptTokens).toBeUndefined()
      expect(result.usage.completionTokens).toBeUndefined()
    })
  })
})
