// Using bun test globals
import { describe, expect, it } from 'bun:test'
import {
  convertToolCall,
  convertToolCalls,
  createToolCall
} from '../../../src/utils/tool/convert'

describe('convertToolCall', () => {
  it('should convert v4 tool call format to v5 format', () => {
    const v4ToolCall = {
      toolCallId: 'call_123',
      toolName: 'get_weather',
      args: '{"location": "New York"}'
    }

    const result = convertToolCall(v4ToolCall)

    expect(result).toEqual({
      toolCallId: 'call_123',
      toolName: 'get_weather',
      input: '{"location": "New York"}'
    })
  })

  it('should handle v5 format passed through unchanged', () => {
    const v5ToolCall = {
      toolCallId: 'call_456',
      toolName: 'calculate',
      input: '{"x": 5, "y": 10}'
    }

    const result = convertToolCall(v5ToolCall)

    expect(result).toEqual(v5ToolCall)
  })

  it('should prioritize input over args when both exist', () => {
    const mixedToolCall = {
      toolCallId: 'call_789',
      toolName: 'mixed_tool',
      args: '{"old": "value"}',
      input: '{"new": "value"}'
    }

    const result = convertToolCall(mixedToolCall)

    expect(result).toEqual({
      toolCallId: 'call_789',
      toolName: 'mixed_tool',
      input: '{"new": "value"}'
    })
  })

  it('should handle missing args/input gracefully', () => {
    const toolCall = {
      toolCallId: 'call_no_args',
      toolName: 'no_params_tool'
    }

    const result = convertToolCall(toolCall)

    expect(result).toEqual({
      toolCallId: 'call_no_args',
      toolName: 'no_params_tool',
      input: ''
    })
  })
})

describe('convertToolCalls', () => {
  it('should convert array of v4 tool calls to v5 format', () => {
    const v4ToolCalls = [
      {
        toolCallId: 'call_1',
        toolName: 'tool_1',
        args: '{"param": "value1"}'
      },
      {
        toolCallId: 'call_2',
        toolName: 'tool_2',
        args: '{"param": "value2"}'
      }
    ]

    const result = convertToolCalls(v4ToolCalls)

    expect(result).toEqual([
      {
        toolCallId: 'call_1',
        toolName: 'tool_1',
        input: '{"param": "value1"}'
      },
      {
        toolCallId: 'call_2',
        toolName: 'tool_2',
        input: '{"param": "value2"}'
      }
    ])
  })

  it('should handle empty array', () => {
    const result = convertToolCalls([])
    expect(result).toEqual([])
  })

  it('should handle mixed v4/v5 tool calls', () => {
    const mixedToolCalls = [
      {
        toolCallId: 'call_v4',
        toolName: 'v4_tool',
        args: '{"old": "format"}'
      },
      {
        toolCallId: 'call_v5',
        toolName: 'v5_tool',
        input: '{"new": "format"}'
      }
    ]

    const result = convertToolCalls(mixedToolCalls)

    expect(result).toEqual([
      {
        toolCallId: 'call_v4',
        toolName: 'v4_tool',
        input: '{"old": "format"}'
      },
      {
        toolCallId: 'call_v5',
        toolName: 'v5_tool',
        input: '{"new": "format"}'
      }
    ])
  })
})

describe('createToolCall', () => {
  it('should create a new tool call with v5 format', () => {
    const result = createToolCall('call_new', 'new_tool', '{"test": "data"}')

    expect(result).toEqual({
      toolCallId: 'call_new',
      toolName: 'new_tool',
      input: '{"test": "data"}'
    })
  })

  it('should handle empty input', () => {
    const result = createToolCall('call_empty', 'empty_tool', '')

    expect(result).toEqual({
      toolCallId: 'call_empty',
      toolName: 'empty_tool',
      input: ''
    })
  })

  it('should handle undefined input', () => {
    const result = createToolCall('call_undefined', 'undefined_tool')

    expect(result).toEqual({
      toolCallId: 'call_undefined',
      toolName: 'undefined_tool',
      input: ''
    })
  })
})
