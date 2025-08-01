#!/usr/bin/env bun
import { generateText, streamText } from 'ai'
import { openrouter } from '@openrouter/sdk-v4'
import { heideggerTool } from '../tools/heidegger'
import { ensureApiKey } from '@util/check'

ensureApiKey()

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!
const TEST_MODEL = 'openai/gpt-4.1-nano'

// Reusable OpenRouter provider configuration
const createOpenRouterProvider = (title: string = 'Tool Test Script') =>
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
async function testBasicModeWithTools() {
  logTest('Basic Mode - Tools Enabled')

  try {
    const result = await generateText({
      model: createOpenRouterProvider(),
      messages: [
        { role: 'user', content: 'Give me a Heidegger quote about being' }
      ],
      tools: {
        getHeideggerQuote: heideggerTool
      },
      temperature: 0.7,
      maxTokens: 500
    })

    logInfo(`Response: ${result.text}`)

    if (result.toolCalls && result.toolCalls.length > 0) {
      logSuccess(`Tool calls detected: ${result.toolCalls.length}`)
      result.toolCalls.forEach((call, index) => {
        logInfo(`  Tool ${index + 1}: ${call.toolName}`)
        logInfo(`  Arguments: ${JSON.stringify(call.args)}`)
      })
    } else {
      logError('No tool calls detected')
    }

    if (result.toolResults && result.toolResults.length > 0) {
      logSuccess(`Tool results received: ${result.toolResults.length}`)
      result.toolResults.forEach((result, index) => {
        if (result.result && typeof result.result === 'object' && 'quote' in result.result) {
          const quote = result.result as any
          logInfo(`  Quote ${index + 1}: "${quote.quote}" - ${quote.author}`)
        }
      })
    } else {
      logError('No tool results received')
    }

  } catch (error) {
    logError('Basic mode with tools failed', error)
  }
}

async function testBasicModeWithoutTools() {
  logTest('Basic Mode - Tools Disabled')

  try {
    const result = await generateText({
      model: createOpenRouterProvider(),
      messages: [
        { role: 'user', content: 'Give me a Heidegger quote about being' }
      ],
      temperature: 0.7,
      maxTokens: 500
      // No tools provided
    })

    logInfo(`Response: ${result.text}`)

    if (!result.toolCalls || result.toolCalls.length === 0) {
      logSuccess('No tool calls made (as expected)')
    } else {
      logError(`Unexpected tool calls: ${result.toolCalls.length}`)
    }

  } catch (error) {
    logError('Basic mode without tools failed', error)
  }
}

async function testStreamingModeWithTools() {
  logTest('Streaming Mode - Tools Enabled')

  try {
    const result = streamText({
      model: createOpenRouterProvider(),
      messages: [
        { role: 'user', content: 'Give me a random Heidegger quote and explain its significance' }
      ],
      tools: {
        getHeideggerQuote: heideggerTool
      },
      toolChoice: 'required',
      maxSteps: 2,
      temperature: 0.7,
      maxTokens: 500
    })

    let fullText = ''
    let toolCallsCount = 0
    let toolResultsCount = 0

    for await (const textPart of result.textStream) {
      fullText += textPart
    }

    // Wait for the result to complete
    const finalResult = await result

    const finalText = await finalResult.text
    logInfo(`Streamed text: ${fullText}`)
    logInfo(`Final response: ${finalText}`)

    const toolCalls = await finalResult.toolCalls
    const toolResults = await finalResult.toolResults

    if (toolCalls && toolCalls.length > 0) {
      toolCallsCount = toolCalls.length
      logSuccess(`Tool calls in streaming: ${toolCallsCount}`)
      toolCalls.forEach((call, index) => {
        logInfo(`  Tool ${index + 1}: ${call.toolName}`)
        logInfo(`  Arguments: ${JSON.stringify(call.args, null, 2)}`)
      })
    }

    if (toolResults && toolResults.length > 0) {
      toolResultsCount = toolResults.length
      logSuccess(`Tool results in streaming: ${toolResultsCount}`)
      toolResults.forEach((result, index) => {
        if (result.result && typeof result.result === 'object' && 'quote' in result.result) {
          const quote = result.result as any
          logInfo(`  Quote ${index + 1}: "${quote.quote.substring(0, 50)}..."`)
        }
      })
    }

    if (toolCallsCount === 0 && toolResultsCount === 0) {
      logError('No tools used in streaming mode')
    }

  } catch (error) {
    logError('Streaming mode with tools failed', error as Error)
  }
}

async function testToolWithDifferentCategories() {
  logTest('Tool Categories Test')

  const categories = ['being', 'time', 'anxiety', 'dasein', 'thinking', 'language', 'random']

  for (const category of categories) {
    try {
      const result = await generateText({
        model: createOpenRouterProvider(),
        messages: [
          { role: 'user', content: `Give me a Heidegger quote about ${category}` }
        ],
        tools: {
          getHeideggerQuote: heideggerTool
        },
        temperature: 0.7,
        maxTokens: 300
      })

      if (result.toolResults && result.toolResults.length > 0) {
        const quote = result.toolResults[0].result as any
        logSuccess(`${category}: "${quote.quote?.substring(0, 50)}..."`)
      } else {
        logError(`No quote received for category: ${category}`)
      }

    } catch (error) {
      logError(`Category ${category} test failed`, error)
    }
  }
}

async function testErrorHandling() {
  logTest('Error Handling Test')

  try {
    // Test with invalid model
    const result = await generateText({
      model: openrouter('invalid/model', {
        apiKey: OPENROUTER_API_KEY,
        headers: {
          'HTTP-Referer': 'https://openrouter.ai',
          'X-Title': 'Tool Test Script'
        }
      }),
      messages: [
        { role: 'user', content: 'Give me a quote' }
      ],
      tools: {
        getHeideggerQuote: heideggerTool
      },
      temperature: 0.7,
      maxTokens: 300
    })

    logError('Expected error but got success')

  } catch (error) {
    logSuccess('Error handling works correctly')
    logInfo(`Error caught: ${(error as Error).message}`)
  }
}


// Main test runner
async function runAllTests() {
  console.log('🚀 Starting OpenRouter AI SDK v4 Tool Tests')
  console.log(`Using model: ${TEST_MODEL}`)

  const startTime = Date.now()

  // Run all tests
  await testBasicModeWithTools()
  await testBasicModeWithoutTools()
  await testStreamingModeWithTools()
  await testToolWithDifferentCategories()
  await testErrorHandling()

  const endTime = Date.now()
  const duration = (endTime - startTime) / 1000

  console.log('\n' + '='.repeat(50))
  console.log(`🏁 Tests completed in ${duration.toFixed(2)}s`)
  console.log('💡 Check the output above for any failed tests')
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error)
}

export {
  testBasicModeWithTools,
  testBasicModeWithoutTools,
  testStreamingModeWithTools,
  testToolWithDifferentCategories,
  testErrorHandling,
  runAllTests
}