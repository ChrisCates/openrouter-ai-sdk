// Using bun test globals
import { describe, expect, it } from 'bun:test'
import { parseToolCallInput } from '../../../src/utils/tool/parse'

describe('parseToolCallInput', () => {
  it('should parse valid JSON string to object', () => {
    const input = '{"name": "John", "age": 30, "city": "New York"}'
    const result = parseToolCallInput(input)

    expect(result).toEqual({
      name: 'John',
      age: 30,
      city: 'New York'
    })
  })

  it('should parse empty JSON object', () => {
    const input = '{}'
    const result = parseToolCallInput(input)

    expect(result).toEqual({})
  })

  it('should parse JSON array', () => {
    const input = '[1, 2, 3, "test"]'
    const result = parseToolCallInput(input)

    expect(result).toEqual([1, 2, 3, 'test'])
  })

  it('should parse nested JSON objects', () => {
    const input =
      '{"user": {"name": "Alice", "preferences": {"theme": "dark"}}}'
    const result = parseToolCallInput(input)

    expect(result).toEqual({
      user: {
        name: 'Alice',
        preferences: {
          theme: 'dark'
        }
      }
    })
  })

  it('should throw error for invalid JSON', () => {
    const input = '{"invalid": json}'

    expect(() => parseToolCallInput(input)).toThrow(
      'Invalid JSON in tool call input'
    )
  })

  it('should throw error for incomplete JSON', () => {
    const input = '{"incomplete":'

    expect(() => parseToolCallInput(input)).toThrow(
      'Invalid JSON in tool call input'
    )
  })

  it('should handle empty string input', () => {
    const input = ''

    expect(() => parseToolCallInput(input)).toThrow(
      'Invalid JSON in tool call input'
    )
  })

  it('should handle null string input', () => {
    const input = 'null'
    const result = parseToolCallInput(input)

    expect(result).toBeNull()
  })

  it('should handle boolean string input', () => {
    const input = 'true'
    const result = parseToolCallInput(input)

    expect(result).toBe(true)
  })

  it('should handle number string input', () => {
    const input = '42'
    const result = parseToolCallInput(input)

    expect(result).toBe(42)
  })

  it('should handle string with escaped quotes', () => {
    const input = '{"message": "He said \\"Hello\\" to me"}'
    const result = parseToolCallInput(input)

    expect(result).toEqual({
      message: 'He said "Hello" to me'
    })
  })

  it('should handle unicode characters', () => {
    const input = '{"emoji": "🚀", "chinese": "你好"}'
    const result = parseToolCallInput(input)

    expect(result).toEqual({
      emoji: '🚀',
      chinese: '你好'
    })
  })
})
