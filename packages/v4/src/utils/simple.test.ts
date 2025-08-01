// Simple test to verify basic functionality without complex server mocking
import { describe, expect, it } from 'bun:test'
import { convertToOpenRouterChatMessages } from './convert/chat.messages'

describe('Basic functionality tests', () => {
  it('should convert simple user message', () => {
    const result = convertToOpenRouterChatMessages([
      {
        role: 'user',
        content: [{ type: 'text', text: 'Hello' }]
      }
    ])

    expect(result).toEqual([{ role: 'user', content: 'Hello' }])
  })

  it('should convert system message', () => {
    const result = convertToOpenRouterChatMessages([
      {
        role: 'system',
        content: 'You are a helpful assistant'
      }
    ])

    expect(result).toEqual([
      { role: 'system', content: 'You are a helpful assistant' }
    ])
  })

  it('should convert assistant message with tool calls', () => {
    const result = convertToOpenRouterChatMessages([
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'I need to use a tool' },
          {
            type: 'tool-call',
            toolCallId: 'call-123',
            toolName: 'calculator',
            args: { expression: '2+2' }
          }
        ]
      }
    ])

    expect(result).toEqual([
      {
        role: 'assistant',
        content: 'I need to use a tool',
        tool_calls: [
          {
            id: 'call-123',
            type: 'function',
            function: {
              name: 'calculator',
              arguments: JSON.stringify({ expression: '2+2' })
            }
          }
        ]
      }
    ])
  })
})
