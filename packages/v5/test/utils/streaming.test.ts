import { beforeEach, describe, expect, it } from 'bun:test'
import {
  createFinishPart,
  createReasoningPart,
  StreamingStateManager
} from '../../src/utils/streaming'

describe('StreamingStateManager', () => {
  let stateManager: StreamingStateManager

  beforeEach(() => {
    stateManager = new StreamingStateManager()
  })

  describe('text block management', () => {
    it('should create and manage text blocks', () => {
      const { id, startPart } = stateManager.startTextBlock()

      expect(id).toBeDefined()
      expect(startPart).toEqual({
        type: 'text-start',
        id
      })

      // Add text content
      const deltaPart = stateManager.addTextDelta(id, 'Hello')
      expect(deltaPart).toEqual({
        type: 'text-delta',
        id,
        textDelta: 'Hello'
      })

      // Add more content
      stateManager.addTextDelta(id, ' world')
      expect(stateManager.getTextContent(id)).toBe('Hello world')

      // End text block
      const endPart = stateManager.endTextBlock(id)
      expect(endPart).toEqual({
        type: 'text-end',
        id
      })
    })

    it('should handle invalid text block operations', () => {
      expect(stateManager.addTextDelta('invalid-id', 'text')).toBeNull()
      expect(stateManager.endTextBlock('invalid-id')).toBeNull()
      expect(stateManager.getTextContent('invalid-id')).toBe('')
    })
  })

  describe('tool input management', () => {
    it('should create and manage tool inputs', () => {
      const { id, startPart } = stateManager.startToolInput(
        'call_123',
        'get_weather'
      )

      expect(id).toBeDefined()
      expect(startPart).toEqual({
        type: 'tool-input-start',
        id,
        toolCallId: 'call_123',
        toolName: 'get_weather'
      })

      // Add input content
      const deltaPart = stateManager.addToolInputDelta(id, '{"location"')
      expect(deltaPart).toEqual({
        type: 'tool-input-delta',
        id,
        toolCallId: 'call_123',
        inputDelta: '{"location"'
      })

      // Add more content
      stateManager.addToolInputDelta(id, ': "NYC"}')
      expect(stateManager.getToolInput(id)).toBe('{"location": "NYC"}')

      // End input
      const endPart = stateManager.endToolInput(id)
      expect(endPart).toEqual({
        type: 'tool-input-end',
        id,
        toolCallId: 'call_123',
        input: '{"location": "NYC"}'
      })
    })

    it('should handle invalid tool input operations', () => {
      expect(stateManager.addToolInputDelta('invalid-id', 'input')).toBeNull()
      expect(stateManager.endToolInput('invalid-id')).toBeNull()
      expect(stateManager.getToolInput('invalid-id')).toBe('')
    })
  })

  describe('tool output management', () => {
    it('should create and manage tool outputs', () => {
      const { id, startPart } = stateManager.startToolOutput('call_123')

      expect(id).toBeDefined()
      expect(startPart).toEqual({
        type: 'tool-output-start',
        id,
        toolCallId: 'call_123'
      })

      // Add output content
      const deltaPart = stateManager.addToolOutputDelta(id, 'Temperature')
      expect(deltaPart).toEqual({
        type: 'tool-output-delta',
        id,
        toolCallId: 'call_123',
        outputDelta: 'Temperature'
      })

      // Add more content
      stateManager.addToolOutputDelta(id, ' is 72F')
      expect(stateManager.getToolOutput(id)).toBe('Temperature is 72F')

      // End output
      const endPart = stateManager.endToolOutput(id)
      expect(endPart).toEqual({
        type: 'tool-output-end',
        id,
        toolCallId: 'call_123',
        output: 'Temperature is 72F'
      })
    })

    it('should handle invalid tool output operations', () => {
      expect(stateManager.addToolOutputDelta('invalid-id', 'output')).toBeNull()
      expect(stateManager.endToolOutput('invalid-id')).toBeNull()
      expect(stateManager.getToolOutput('invalid-id')).toBe('')
    })
  })

  describe('state management', () => {
    it('should manage multiple blocks simultaneously', () => {
      const { id: id1 } = stateManager.startTextBlock()
      const { id: id2 } = stateManager.startTextBlock()

      stateManager.addTextDelta(id1, 'First block')
      stateManager.addTextDelta(id2, 'Second block')
      stateManager.addTextDelta(id1, ' continued')
      stateManager.addTextDelta(id2, ' also continued')

      expect(stateManager.getTextContent(id1)).toBe('First block continued')
      expect(stateManager.getTextContent(id2)).toBe(
        'Second block also continued'
      )
    })
  })
})

describe('createFinishPart', () => {
  it('should create finish part with converted usage', () => {
    const usage = {
      promptTokens: 15,
      completionTokens: 25,
      totalTokens: 40,
      cost: 0.002
    }

    const result = createFinishPart('stop', usage)

    expect(result).toEqual({
      type: 'finish',
      finishReason: 'stop',
      usage: {
        inputTokens: 15,
        outputTokens: 25,
        totalTokens: 40,
        cost: 0.002
      }
    })
  })
})

describe('createReasoningPart', () => {
  it('should create reasoning part', () => {
    const result = createReasoningPart('I need to analyze this carefully...')

    expect(result).toEqual({
      type: 'reasoning',
      reasoning: 'I need to analyze this carefully...'
    })
  })
})
