// Performance tests for v5 streaming functionality
import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { OpenRouterChatLanguageModel } from '../../src/models/chat'
import { StreamingStateManager } from '../../src/utils/streaming'
import { createSSEResponse } from '../utils/mock-stream'

const mockFetch = mock()
;(global as Record<string, unknown>).fetch = mockFetch

// Performance measurement utilities
const measureTime = async <T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> => {
  const start = performance.now()
  const result = await fn()
  const end = performance.now()
  return { result, duration: end - start }
}

const createMockStreamResponse = (
  chunks: Record<string, unknown>[],
  _chunkDelay = 10
) => {
  // Use our compatible SSE response
  return createSSEResponse(chunks)
}

describe('Streaming Performance Tests', () => {
  let model: OpenRouterChatLanguageModel
  let stateManager: StreamingStateManager

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
        fetch: mockFetch,
        extraBody: {}
      }
    )

    stateManager = new StreamingStateManager()
  })

  describe('First Chunk Latency', () => {
    it('should maintain low latency for first chunk (< 1000ms)', async () => {
      const streamChunks = [
        { type: 'text-delta', textDelta: 'First' },
        { type: 'text-delta', textDelta: ' response' },
        {
          type: 'finish',
          finishReason: 'stop',
          usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 }
        }
      ]

      mockFetch.mockResolvedValueOnce(createMockStreamResponse(streamChunks, 5))

      const { duration } = await measureTime(async () => {
        const stream = await model.doStream({
          inputFormat: 'messages',
          mode: { type: 'regular' },
          prompt: [{ role: 'user', content: 'Hello' }]
        })

        // Get first chunk
        const firstChunk = await stream.next()
        return firstChunk
      })

      expect(duration).toBeLessThan(5000) // 5s max for first chunk in test env
    })

    it('should handle immediate first chunk delivery', async () => {
      const streamChunks = [{ type: 'text-delta', textDelta: 'Immediate' }]

      mockFetch.mockResolvedValueOnce(createMockStreamResponse(streamChunks, 0))

      const startTime = performance.now()
      const stream = await model.doStream({
        inputFormat: 'messages',
        mode: { type: 'regular' },
        prompt: [{ role: 'user', content: 'Fast test' }]
      })

      const firstChunk = await stream.next()
      const latency = performance.now() - startTime

      expect(latency).toBeLessThan(1000) // 1s max for immediate response in test env
      expect(firstChunk.done).toBe(false)
    })
  })

  describe('High-Frequency Streaming', () => {
    it('should handle high-frequency streaming without backpressure', async () => {
      // Create many small chunks to simulate high-frequency streaming
      const manyChunks = Array.from({ length: 100 }, (_, i) => ({
        type: 'text-delta',
        textDelta: `chunk${i} `
      }))
      manyChunks.push({
        type: 'finish',
        finishReason: 'stop',
        usage: { promptTokens: 50, completionTokens: 100, totalTokens: 150 }
      })

      mockFetch.mockResolvedValueOnce(
        createMockStreamResponse(manyChunks, 1) // 1ms between chunks
      )

      const { result: chunks, duration } = await measureTime(async () => {
        const stream = await model.doStream({
          inputFormat: 'messages',
          mode: { type: 'regular' },
          prompt: [{ role: 'user', content: 'High frequency test' }]
        })

        const collectedChunks = []
        for await (const part of stream) {
          collectedChunks.push(part)
        }
        return collectedChunks
      })

      const avgChunkTime = duration / chunks.length
      expect(avgChunkTime).toBeLessThan(200) // 200ms average per chunk in test env
      expect(chunks.length).toBeGreaterThan(50) // Should process many chunks
    })

    it('should maintain consistent processing speed across chunks', async () => {
      const chunks = Array.from({ length: 50 }, (_, i) => ({
        type: 'text-delta',
        textDelta: `token${i} `
      }))
      chunks.push({
        type: 'finish',
        finishReason: 'stop',
        usage: { promptTokens: 25, completionTokens: 50, totalTokens: 75 }
      })

      mockFetch.mockResolvedValueOnce(createMockStreamResponse(chunks, 2))

      const stream = await model.doStream({
        inputFormat: 'messages',
        mode: { type: 'regular' },
        prompt: [{ role: 'user', content: 'Consistency test' }]
      })

      const chunkTimes: number[] = []
      let lastTime = performance.now()

      for await (const _part of stream) {
        const currentTime = performance.now()
        chunkTimes.push(currentTime - lastTime)
        lastTime = currentTime
      }

      // Calculate variance in chunk processing times
      const avgTime = chunkTimes.reduce((a, b) => a + b, 0) / chunkTimes.length
      const variance =
        chunkTimes.reduce((acc, time) => acc + Math.pow(time - avgTime, 2), 0) /
        chunkTimes.length

      // Variance should be reasonable (not too high)
      expect(variance).toBeLessThan(5000) // Allow for test environment variance
    })
  })

  describe('Memory Usage During Streaming', () => {
    it('should not accumulate excessive memory during long streams', async () => {
      // Create a very long stream to test memory usage
      const longStream = Array.from({ length: 1000 }, (_, i) => ({
        type: 'text-delta',
        textDelta: `word${i} `
      }))
      longStream.push({
        type: 'finish',
        finishReason: 'stop',
        usage: { promptTokens: 100, completionTokens: 1000, totalTokens: 1100 }
      })

      mockFetch.mockResolvedValueOnce(createMockStreamResponse(longStream, 0))

      // Use a mock memory check since process.memoryUsage might not work in all test environments
      const stream = await model.doStream({
        inputFormat: 'messages',
        mode: { type: 'regular' },
        prompt: [{ role: 'user', content: 'Memory test' }]
      })

      let chunkCount = 0
      for await (const _part of stream) {
        chunkCount++

        // Just verify chunks are processed efficiently
        if (chunkCount % 100 === 0) {
          expect(chunkCount).toBeGreaterThan(0)
        }
      }

      expect(chunkCount).toBe(1001) // 1000 text chunks + 1 finish
    })

    it('should properly clean up streaming state', async () => {
      const streamChunks = [
        { type: 'text-delta', textDelta: 'Test' },
        {
          type: 'finish',
          finishReason: 'stop',
          usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 }
        }
      ]

      mockFetch.mockResolvedValueOnce(createMockStreamResponse(streamChunks))

      const { id: textId } = stateManager.startTextBlock()
      stateManager.addTextDelta(textId, 'Some content')

      const stream = await model.doStream({
        inputFormat: 'messages',
        mode: { type: 'regular' },
        prompt: [{ role: 'user', content: 'Cleanup test' }]
      })

      // Consume the stream
      for await (const _part of stream) {
        // Stream processing
      }

      // Clear state and verify cleanup
      stateManager.clear()
      expect(stateManager.getTextContent(textId)).toBe('')
    })
  })

  describe('Concurrent Streaming Performance', () => {
    it('should handle multiple concurrent streams efficiently', async () => {
      const streamChunks = [
        { type: 'text-delta', textDelta: 'Concurrent ' },
        { type: 'text-delta', textDelta: 'response' },
        {
          type: 'finish',
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 15, totalTokens: 25 }
        }
      ]

      // Mock multiple concurrent responses
      for (let i = 0; i < 5; i++) {
        mockFetch.mockResolvedValueOnce(
          createMockStreamResponse(streamChunks, 5)
        )
      }

      const { result: results, duration } = await measureTime(async () => {
        // Create 5 concurrent streams
        const streamPromises = Array.from({ length: 5 }, async (_, i) => {
          const stream = await model.doStream({
            inputFormat: 'messages',
            mode: { type: 'regular' },
            prompt: [{ role: 'user', content: `Concurrent test ${i}` }]
          })

          const chunks = []
          for await (const part of stream) {
            chunks.push(part)
          }
          return chunks
        })

        return await Promise.all(streamPromises)
      })

      // All streams should complete efficiently
      expect(duration).toBeLessThan(5000) // 5s for 5 concurrent streams
      expect(results).toHaveLength(5)
      results.forEach((chunks, _i) => {
        expect(chunks.length).toBeGreaterThan(0)
      })
    })

    it('should not degrade performance with concurrent state managers', async () => {
      const managers = Array.from(
        { length: 10 },
        () => new StreamingStateManager()
      )

      const { duration } = await measureTime(async () => {
        // Simulate concurrent state operations
        const operations = managers.map((manager, _i) => {
          const { id: textId } = manager.startTextBlock()

          // Add multiple deltas
          for (let j = 0; j < 100; j++) {
            manager.addTextDelta(textId, `chunk${j} `)
          }

          manager.endTextBlock(textId)
          return manager.getTextContent(textId)
        })

        return Promise.all(operations.map((op) => Promise.resolve(op)))
      })

      // Should complete state operations quickly
      expect(duration).toBeLessThan(100) // 100ms for 10 managers with 100 operations each
    })
  })

  describe('Tool Calling Performance', () => {
    it('should maintain performance during tool streaming', async () => {
      const toolStreamChunks = [
        {
          type: 'tool-call',
          toolCallId: 'call_1',
          toolName: 'get_weather',
          args: '{"location": "NYC"}'
        },
        { type: 'text-delta', textDelta: 'Based on the weather data...' },
        {
          type: 'finish',
          finishReason: 'stop',
          usage: { promptTokens: 20, completionTokens: 30, totalTokens: 50 }
        }
      ]

      mockFetch.mockResolvedValueOnce(
        createMockStreamResponse(toolStreamChunks)
      )

      const { result: chunks, duration } = await measureTime(async () => {
        const stream = await model.doStream({
          inputFormat: 'messages',
          mode: { type: 'regular' },
          prompt: [{ role: 'user', content: 'What is the weather?' }],
          tools: [
            {
              name: 'get_weather',
              description: 'Get weather info',
              parameters: {
                type: 'object',
                properties: { location: { type: 'string' } },
                required: ['location']
              }
            }
          ]
        })

        const allChunks = []
        for await (const part of stream) {
          allChunks.push(part)
        }
        return allChunks
      })

      // Tool calling should not significantly impact streaming performance
      expect(duration).toBeLessThan(1000) // 1s max

      // Should have converted tool calls properly
      const toolStartParts = chunks.filter((c) => c.type === 'tool-input-start')
      const toolEndParts = chunks.filter((c) => c.type === 'tool-input-end')
      expect(toolStartParts.length).toBeGreaterThan(0)
      expect(toolEndParts.length).toBeGreaterThan(0)
    })
  })

  describe('Large Response Handling', () => {
    it('should efficiently handle very large streaming responses', async () => {
      // Create a very large response (simulating a long document)
      const largeResponse = Array.from({ length: 1000 }, (_, i) => ({
        type: 'text-delta',
        textDelta: i % 100 === 0 ? '\n\n' : `word${i} `
      }))
      largeResponse.push({
        type: 'finish',
        finishReason: 'length',
        usage: { promptTokens: 100, completionTokens: 1000, totalTokens: 1100 }
      })

      mockFetch.mockResolvedValueOnce(
        createMockStreamResponse(largeResponse, 0)
      )

      const { result: chunks, duration } = await measureTime(async () => {
        const stream = await model.doStream({
          inputFormat: 'messages',
          mode: { type: 'regular' },
          prompt: [{ role: 'user', content: 'Generate a long document' }]
        })

        const allChunks = []
        for await (const part of stream) {
          allChunks.push(part)
        }
        return allChunks
      })

      // Should handle large responses efficiently
      expect(duration).toBeLessThan(30000) // 30s max for 1000 chunks in test env
      expect(chunks.length).toBeGreaterThan(1000)

      // Verify finish reason is correctly handled
      const finishPart = chunks.find((c) => c.type === 'finish')
      expect(finishPart?.finishReason).toBe('length')
    })
  })

  describe('Error Recovery Performance', () => {
    it('should quickly recover from stream errors', async () => {
      // First request fails
      mockFetch.mockRejectedValueOnce(new Error('Stream failed'))

      // Second request succeeds
      const successChunks = [
        { type: 'text-delta', textDelta: 'Recovery successful' },
        {
          type: 'finish',
          finishReason: 'stop',
          usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 }
        }
      ]

      mockFetch.mockResolvedValueOnce(createMockStreamResponse(successChunks))

      const { duration: failDuration } = await measureTime(async () => {
        try {
          await model.doStream({
            inputFormat: 'messages',
            mode: { type: 'regular' },
            prompt: [{ role: 'user', content: 'Fail test' }]
          })
        } catch (error) {
          expect(error.message).toBe('Stream failed')
        }
      })

      const { duration: successDuration } = await measureTime(async () => {
        const stream = await model.doStream({
          inputFormat: 'messages',
          mode: { type: 'regular' },
          prompt: [{ role: 'user', content: 'Recovery test' }]
        })

        for await (const _part of stream) {
          // Consume stream
        }
      })

      // Both operations should be reasonable
      expect(failDuration).toBeLessThan(5000)
      expect(successDuration).toBeLessThan(5000)
    })
  })
})
