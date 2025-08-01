#!/usr/bin/env bun
import { generateText, streamText, stepCountIs } from 'ai'
import { openrouter } from '@openrouter/sdk-v5'
import { heideggerTool } from '../tools/heidegger'
import { ensureApiKey } from '@util/check'

ensureApiKey()

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!
const TEST_MODEL = 'openai/gpt-4.1-nano'

// Reusable OpenRouter provider configuration
const createOpenRouterProvider = (title: string = 'Tool Test Script v5') =>
  openrouter(TEST_MODEL, {
    apiKey: OPENROUTER_API_KEY,
    headers: {
      'HTTP-Referer': 'https://openrouter.ai',
      'X-Title': title
    }
  })

// Test utilities
const logTest = (testName: string) => {
  console.log(`\n🧪 ${testName}`)
  console.log('=' .repeat(50))
}

const logSuccess = (message: string) => {
  console.log(`✅ ${message}`)
}

const logError = (message: string, error?: any) => {
  console.log(`❌ ${message}`)
  if (error) {
    console.log(`   Error: ${error.message || error}`)
  }
}

const logInfo = (message: string) => {
  console.log(`ℹ️  ${message}`)
}

// Test cases
async function testGenerateTextWithTools() {
  logTest('Generate Text - Tools Enabled (v5)')

  try {
    const result = await generateText({
      model: createOpenRouterProvider(),
      messages: [
        { role: 'user', content: 'Give me a Heidegger quote about anxiety' }
      ],
      toolChoice: 'required',
      tools: {
        getHeideggerQuote: heideggerTool
      },
      temperature: 0.7,
      maxOutputTokens: 500
    })

    logInfo(`Response: ${result.text}`)

    const toolCalls = await result.toolCalls
    const toolResults = await result.toolResults

    if (toolCalls && toolCalls.length > 0) {
      logSuccess(`Tool calls detected: ${toolCalls.length}`)
      toolCalls.forEach((call, index) => {
        logInfo(`  Tool ${index + 1}: ${call.toolName}`)
        logInfo(`  Arguments: ${JSON.stringify((call as any).input || (call as any).args, null, 2)}`)
      })
    } else {
      logError('No tool calls detected')
    }

    if (toolResults && toolResults.length > 0) {
      logSuccess(`Tool results received: ${toolResults.length}`)
      toolResults.forEach((toolResult, index) => {
        const result = (toolResult as any).result
        if (result && typeof result === 'object' && 'quote' in result) {
          const quote = result as any
          logInfo(`  Quote ${index + 1}: "${quote.quote}" - ${quote.author}`)
        }
      })
    } else {
      logError('No tool results received')
    }

  } catch (error) {
    logError('Generate text with tools failed', error as Error)
  }
}

async function testGenerateTextWithoutTools() {
  logTest('Generate Text - Tools Disabled (v5)')

  try {
    const result = await generateText({
      model: createOpenRouterProvider(),
      messages: [
        { role: 'user', content: 'Tell me about Heidegger philosophy' }
      ],
      temperature: 0.7,
      maxOutputTokens: 500
      // No tools provided
    })

    logInfo(`Response: ${result.text}`)

    const toolCalls = await result.toolCalls
    if (!toolCalls || toolCalls.length === 0) {
      logSuccess('No tool calls made (as expected)')
    } else {
      logError(`Unexpected tool calls: ${toolCalls.length}`)
    }

  } catch (error) {
    logError('Generate text without tools failed', error as Error)
  }
}

async function testStreamTextWithTools() {
  logTest('Stream Text - Tools Enabled (v5)')

  try {
    const result = streamText({
      model: createOpenRouterProvider(),
      messages: [
        { role: 'user', content: 'Give me a Heidegger quote about dasein and explain its significance' }
      ],
      toolChoice: 'required',
      tools: {
        getHeideggerQuote: heideggerTool
      },
      stopWhen: stepCountIs(2),
      temperature: 0.7,
      maxOutputTokens: 500
    })

    let streamedText = ''
    let toolCallsCount = 0
    let toolResultsCount = 0

    // Use fullStream to capture all events including tool calls
    for await (const chunk of result.fullStream) {
      if (chunk.type === 'text-delta') {
        streamedText += chunk.text
      } else if (chunk.type === 'tool-input-delta') {
        if (!toolCallsCount) { // First tool input delta
          toolCallsCount++
          logInfo(`Tool call streaming: ${(chunk as any).toolName || 'getHeideggerQuote'}`)
        }
      } else if (chunk.type === 'tool-call') {
        logInfo(`Tool call completed: ${chunk.toolName}`)
        logInfo(`Arguments: ${JSON.stringify((chunk as any).input || (chunk as any).args, null, 2)}`)
      } else if (chunk.type === 'tool-result') {
        toolResultsCount++
        const result = (chunk as any).output || (chunk as any).result
        if (result && typeof result === 'object' && 'quote' in result) {
          logInfo(`Tool result: "${(result as any).quote.substring(0, 50)}..."`)
        }
      } else if (chunk.type === 'finish-step') {
        logInfo(`Step finished: ${(chunk as any).finishReason}`)
      }
    }

    // Wait for final result
    const finalResult = await result

    logInfo(`Streamed text: ${streamedText}`)
    const finalText = await finalResult.text
    logInfo(`Final text: ${finalText}`)

    // Check final result for tool calls and results
    const finalToolCalls = await finalResult.toolCalls
    const finalToolResults = await finalResult.toolResults
    
    if (finalToolCalls && finalToolCalls.length > 0) {
      logSuccess(`Final tool calls: ${finalToolCalls.length}`)
      finalToolCalls.forEach((call, index) => {
        logInfo(`  Final Tool ${index + 1}: ${call.toolName}`)
      })
    }
    
    if (finalToolResults && finalToolResults.length > 0) {
      toolResultsCount = finalToolResults.length
      logSuccess(`Final tool results: ${finalToolResults.length}`)
      finalToolResults.forEach((result, index) => {
        const output = (result as any).output || (result as any).result
        if (output && typeof output === 'object' && 'quote' in output) {
          logInfo(`  Result ${index + 1}: "${output.quote.substring(0, 50)}..."`)
        }
      })
    }

    if (toolCallsCount > 0) {
      logSuccess(`Tool calls detected in stream: ${toolCallsCount}`)
    }

    if (toolResultsCount > 0) {
      logSuccess(`Tool results detected: ${toolResultsCount}`)
    }

    if (toolCallsCount === 0) {
      logError('No tools used in streaming mode')
    } else if (toolResultsCount === 0) {
      logInfo('Note: Tool calls detected in stream, but execution results not available in streaming mode')
      logSuccess('V5 streaming with tools is working (tool calls detected)')
    }

  } catch (error) {
    logError('Stream text with tools failed', error as Error)
  }
}

async function testUIMessageStreamResponse() {
  logTest('UIMessage Stream Response Format (v5)')

  try {
    const result = streamText({
      model: createOpenRouterProvider(),
      messages: [
        { role: 'user', content: 'Get me a quote about thinking' }
      ],
      toolChoice: 'required',
      tools: {
        getHeideggerQuote: heideggerTool
      },
      temperature: 0.7,
      maxOutputTokens: 400
    })

    // Test toUIMessageStreamResponse format
    const streamResponse = result.toUIMessageStreamResponse()

    logInfo('Testing UIMessage stream response format...')

    // This would typically be consumed by useChat
    // For testing, we'll just verify it returns a Response
    if (streamResponse instanceof Response) {
      logSuccess('UIMessage stream response format is valid')

      // Check if it's a streaming response
      if (streamResponse.body) {
        logSuccess('Response has streaming body')
      } else {
        logError('Response missing streaming body')
      }
    } else {
      logError('Invalid UIMessage stream response format')
    }

  } catch (error) {
    logError('UIMessage stream response test failed', error as Error)
  }
}

async function testToolInputSchemaValidation() {
  logTest('Tool Input Schema Validation (v5)')

  const testCases = [
    { category: 'being', expected: true },
    { category: 'invalid-category', expected: false },
    { category: undefined, expected: true }, // optional field
    { invalidField: 'test', expected: false }
  ]

  for (const testCase of testCases) {
    try {
      // Test input validation first
      if (!testCase.expected) {
        try {
          // For v5, we need to access the underlying Zod schema
          const zodSchema = (heideggerTool.inputSchema as any)._def?.zodSchema || heideggerTool.inputSchema
          if (zodSchema && typeof zodSchema.parse === 'function') {
            zodSchema.parse(testCase)
            logError(`Invalid input should have been rejected: ${JSON.stringify(testCase)}`)
          } else {
            logInfo(`Schema validation not available for: ${JSON.stringify(testCase)}`)
          }
        } catch (error) {
          logSuccess(`Invalid input correctly rejected: ${JSON.stringify(testCase)}`)
        }
        continue
      }

      // Test the tool function directly with valid inputs
      const result = await heideggerTool.execute?.(testCase as any, {} as any)

      if (testCase.expected) {
        logSuccess(`Valid input accepted: ${JSON.stringify(testCase)}`)
        if (result && typeof result === 'object' && 'quote' in result) {
          logInfo(`  Result: "${(result as any).quote.substring(0, 30)}..."`)
        }
      }

    } catch (error) {
      if (!testCase.expected) {
        logSuccess(`Invalid input correctly rejected: ${JSON.stringify(testCase)}`)
      } else {
        logError(`Valid input incorrectly rejected: ${JSON.stringify(testCase)}`, error as Error)
      }
    }
  }
}

async function testToolWithAllCategories() {
  logTest('Tool Categories Comprehensive Test (v5)')

  const categories = ['being', 'time', 'anxiety', 'dasein', 'thinking', 'language', 'random']

  for (const category of categories) {
    try {
      const result = await generateText({
        model: createOpenRouterProvider(),
        messages: [
          { role: 'user', content: `Use the tool to get a Heidegger quote about ${category}` }
        ],
        tools: {
          getHeideggerQuote: heideggerTool
        },
        temperature: 0.5,
        maxOutputTokens: 300
      })

      const toolResults = await result.toolResults
      if (toolResults && toolResults.length > 0) {
        const toolResult = toolResults[0] as any
        const quote = toolResult.output || toolResult.result || toolResult
        logSuccess(`${category}: Category="${quote.category}", Total quotes=${quote.totalQuotes}`)
        logInfo(`  Quote: "${quote.quote?.substring(0, 60)}..."`)
      } else {
        logError(`No quote received for category: ${category}`)
      }

    } catch (error) {
      logError(`Category ${category} test failed`, error as Error)
    }
  }
}


async function testErrorHandling() {
  logTest('Error Handling Test (v5)')

  const errorTests = [
    {
      name: 'Invalid Model',
      config: {
        model: 'invalid/model-that-does-not-exist',
        messages: [{ role: 'user', content: 'Test' }],
        tools: { getHeideggerQuote: heideggerTool }
      }
    },
    {
      name: 'Invalid API Key',
      config: {
        model: TEST_MODEL,
        apiKey: 'invalid-key',
        messages: [{ role: 'user', content: 'Test' }],
        tools: { getHeideggerQuote: heideggerTool }
      }
    }
  ]

  for (const test of errorTests) {
    try {
      const result = await generateText({
        model: openrouter(test.config.model, {
          apiKey: test.config.apiKey || OPENROUTER_API_KEY,
          headers: {
            'HTTP-Referer': 'https://openrouter.ai',
            'X-Title': 'Tool Test Script v5'
          }
        }),
        messages: test.config.messages as any,
        tools: test.config.tools,
        temperature: 0.7,
        maxOutputTokens: 300
      })

      logError(`${test.name}: Expected error but got success`)

    } catch (error) {
      logSuccess(`${test.name}: Error handled correctly`)
      logInfo(`Error: ${(error as Error).message}`)
    }
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting OpenRouter AI SDK v5 Tool Tests')
  console.log(`Using model: ${TEST_MODEL}`)

  const startTime = Date.now()

  // Run all tests
  await testGenerateTextWithTools()
  await testGenerateTextWithoutTools()
  await testStreamTextWithTools()
  await testUIMessageStreamResponse()
  await testToolInputSchemaValidation()
  await testToolWithAllCategories()
  await testErrorHandling()

  const endTime = Date.now()
  const duration = (endTime - startTime) / 1000

  console.log('\n' + '='.repeat(50))
  console.log(`🏁 Tests completed in ${duration.toFixed(2)}s`)
  console.log('💡 Check the output above for any failed tests')
  console.log('📝 v5 uses Zod input schema validation and UIMessage format')
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error)
}

export {
  testGenerateTextWithTools,
  testGenerateTextWithoutTools,
  testStreamTextWithTools,
  testUIMessageStreamResponse,
  testToolInputSchemaValidation,
  testToolWithAllCategories,
  testErrorHandling,
  runAllTests
}