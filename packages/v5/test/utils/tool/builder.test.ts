// Using bun test globals
import { describe, expect, it } from 'bun:test'
import { ToolCallBuilder } from '../../../src/utils/tool/builder'

describe('ToolCallBuilder', () => {
  it('should build a complete tool call', () => {
    const builder = new ToolCallBuilder('call_123', 'get_weather')
    const result = builder.setInput('{"location": "New York"}').build()

    expect(result).toEqual({
      toolCallId: 'call_123',
      toolName: 'get_weather',
      input: '{"location": "New York"}'
    })
  })

  it('should build tool call with object input', () => {
    const builder = new ToolCallBuilder('call_456', 'calculate')
    const result = builder
      .setInputObject({ x: 5, y: 10, operation: 'add' })
      .build()

    expect(result).toEqual({
      toolCallId: 'call_456',
      toolName: 'calculate',
      input: '{"x":5,"y":10,"operation":"add"}'
    })
  })

  it('should build tool call with empty input by default', () => {
    const builder = new ToolCallBuilder('call_789', 'no_params')
    const result = builder.build()

    expect(result).toEqual({
      toolCallId: 'call_789',
      toolName: 'no_params',
      input: ''
    })
  })

  it('should allow chaining multiple operations', () => {
    const builder = new ToolCallBuilder('call_chain', 'chain_test')
    const result = builder
      .setInput('initial')
      .setInputObject({ updated: true })
      .build()

    expect(result).toEqual({
      toolCallId: 'call_chain',
      toolName: 'chain_test',
      input: '{"updated":true}'
    })
  })

  it('should handle complex nested objects', () => {
    const complexInput = {
      user: {
        name: 'Alice',
        preferences: {
          theme: 'dark',
          notifications: true
        }
      },
      actions: ['read', 'write', 'delete'],
      metadata: {
        version: '1.0',
        timestamp: new Date('2023-01-01').toISOString()
      }
    }

    const builder = new ToolCallBuilder('call_complex', 'complex_tool')
    const result = builder.setInputObject(complexInput).build()

    expect(result.toolCallId).toBe('call_complex')
    expect(result.toolName).toBe('complex_tool')
    expect(JSON.parse(result.input)).toEqual(complexInput)
  })

  it('should override previous input when setInput is called multiple times', () => {
    const builder = new ToolCallBuilder('call_override', 'override_test')
    const result = builder
      .setInput('first')
      .setInput('second')
      .setInput('third')
      .build()

    expect(result).toEqual({
      toolCallId: 'call_override',
      toolName: 'override_test',
      input: 'third'
    })
  })

  it('should override previous input when setInputObject is called multiple times', () => {
    const builder = new ToolCallBuilder(
      'call_override_obj',
      'override_obj_test'
    )
    const result = builder
      .setInputObject({ first: true })
      .setInputObject({ second: true })
      .setInputObject({ third: true })
      .build()

    expect(result).toEqual({
      toolCallId: 'call_override_obj',
      toolName: 'override_obj_test',
      input: '{"third":true}'
    })
  })

  it('should handle null and undefined in object input', () => {
    const inputWithNulls = {
      nullValue: null,
      undefinedValue: undefined,
      normalValue: 'test'
    }

    const builder = new ToolCallBuilder('call_nulls', 'null_test')
    const result = builder.setInputObject(inputWithNulls).build()

    // JSON.stringify removes undefined properties but keeps null
    const parsed = JSON.parse(result.input)
    expect(parsed).toEqual({
      nullValue: null,
      normalValue: 'test'
    })
    expect(parsed).not.toHaveProperty('undefinedValue')
  })

  it('should handle arrays in object input', () => {
    const inputWithArrays = {
      numbers: [1, 2, 3],
      strings: ['a', 'b', 'c'],
      mixed: [1, 'two', { three: 3 }, null],
      empty: []
    }

    const builder = new ToolCallBuilder('call_arrays', 'array_test')
    const result = builder.setInputObject(inputWithArrays).build()

    expect(JSON.parse(result.input)).toEqual(inputWithArrays)
  })
})
