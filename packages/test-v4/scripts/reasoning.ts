#!/usr/bin/env bun
import { generateText, streamText } from 'ai'
import { openrouter } from '@openrouter/sdk-v4'
import { ensureApiKey } from '@util/check'

ensureApiKey()

interface ReasoningTestModel {
  name: string
  slug: string
  provider: string
}

const reasoningModels: ReasoningTestModel[] = [
  {
    name: 'DeepSeek R1-0528',
    slug: 'deepseek/deepseek-r1-0528',
    provider: 'DeepSeek'
  },
  {
    name: 'OpenAI o4-mini',
    slug: 'openai/o4-mini',
    provider: 'OpenAI'
  }
]

const reasoningQuestion = `What is 2+2? Show your reasoning.`

async function testGenerateText(model: ReasoningTestModel): Promise<boolean> {
  try {
    console.log(`\n${'-'.repeat(80)}`)
    console.log(`🤖 MODEL: ${model.name} (${model.slug}) - GENERATE TEXT`)
    console.log(`${'-'.repeat(80)}`)
    console.log(`❓ QUESTION: ${reasoningQuestion}`)
    console.log(`${'─'.repeat(80)}`)

    const result = await generateText({
      model: openrouter(model.slug),
      messages: [
        { role: 'user', content: reasoningQuestion }
      ],
      maxTokens: 500,
      temperature: 0.1
    })

    // Check for reasoning in response parts
    let hasReasoning = false
    if (result.response && result.response.messages && result.response.messages.length > 0) {
      const lastMessage = result.response.messages[result.response.messages.length - 1]
      if (lastMessage.content) {
        for (const part of lastMessage.content) {
          if (typeof part === 'object' && part !== null && 'type' in part) {
            if (part.type === 'reasoning') {
              hasReasoning = true
              console.log(`🧠 REASONING TRACE:`)
              if ('text' in part && typeof part.text === 'string') {
                console.log(part.text)
              }
              break
            } else if (part.type === 'text' && 'text' in part && typeof part.text === 'string') {
              console.log(`💭 RESPONSE:`)
              console.log(part.text)
            }
          }
        }
      }
    }

    if (!hasReasoning && result.text) {
      console.log(`💭 RESPONSE:`)
      console.log(result.text)
    } else if (!hasReasoning && !result.text) {
      console.log(`💭 RESPONSE: (No text response found)`)
    }

    console.log(`${'─'.repeat(80)}`)
    console.log(
      `📊 USAGE: ${result.usage.promptTokens} prompt + ${result.usage.completionTokens} completion = ${result.usage.totalTokens} total tokens`
    )

    if (result.finishReason) {
      console.log(`🏁 FINISH: ${result.finishReason}`)
    }

    console.log(`✅ STATUS: SUCCESS`)
    return true
  } catch (error) {
    console.log(`❌ STATUS: FAILED - ${error}`)
    return false
  }
}

async function testStreamText(model: ReasoningTestModel): Promise<boolean> {
  try {
    console.log(`\n${'-'.repeat(80)}`)
    console.log(`🤖 MODEL: ${model.name} (${model.slug}) - STREAM TEXT`)
    console.log(`${'-'.repeat(80)}`)
    console.log(`❓ QUESTION: ${reasoningQuestion}`)
    console.log(`${'─'.repeat(80)}`)

    const result = await streamText({
      model: openrouter(model.slug),
      messages: [
        { role: 'user', content: reasoningQuestion }
      ],
      maxTokens: 500,
      temperature: 0.1
    })

    console.log(`💭 STREAMING RESPONSE:`)

    // Stream text to console in real-time (like streaming.ts)
    let fullText = ''
    let chunkCount = 0
    let hasStreamedReasoning = false

    for await (const delta of result.textStream) {
      process.stdout.write(delta)
      fullText += delta
      chunkCount++
    }

    console.log(`\n📦 CHUNKS: ${chunkCount}`)

    console.log(`\n${'─'.repeat(80)}`)

    // Get final results
    const finalResult = await result.response
    const usage = await result.usage
    const finishReason = await result.finishReason

    // Check for reasoning in the final result
    let hasReasoning = false
    if (finalResult.messages && finalResult.messages.length > 0) {
      const lastMessage = finalResult.messages[finalResult.messages.length - 1]
      if (lastMessage.content) {
        for (const part of lastMessage.content) {
          if (typeof part === 'object' && part !== null && 'type' in part) {
            if (part.type === 'reasoning') {
              hasReasoning = true
              console.log(`🧠 REASONING TRACE:`)
              if ('text' in part && typeof part.text === 'string') {
                console.log(part.text)
              }
              console.log(`${'─'.repeat(80)}`)
              break
            }
          }
        }
      }
    }

    if (!hasReasoning) {
      console.log('🧠 No separate reasoning trace found in streaming response')
      console.log(`${'─'.repeat(80)}`)
    }

    console.log(
      `📊 USAGE: ${usage.promptTokens} prompt + ${usage.completionTokens} completion = ${usage.totalTokens} total tokens`
    )

    if (finishReason) {
      console.log(`🏁 FINISH: ${finishReason}`)
    }

    console.log(`✅ STATUS: SUCCESS`)
    return true
  } catch (error) {
    console.log(`❌ STATUS: FAILED - ${error}`)
    return false
  }
}

async function runReasoningTests() {
  console.log('🧠 OpenRouter AI SDK v4 - Reasoning Tests')
  console.log('-'.repeat(50))

  const results: {
    model: string
    generateText: boolean
    streamText: boolean
  }[] = []

  for (const model of reasoningModels) {
    const generateResult = await testGenerateText(model)
    const streamResult = await testStreamText(model)

    results.push({
      model: model.name,
      generateText: generateResult,
      streamText: streamResult
    })

    // Delay between tests to be respectful to the API
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  console.log('\n📈 Reasoning Test Results Summary')
  console.log('-'.repeat(50))

  let totalTests = 0
  let passedTests = 0

  results.forEach((result) => {
    const generateStatus = result.generateText ? '✅' : '❌'
    const streamStatus = result.streamText ? '✅' : '❌'

    console.log(
      `${result.model}: Generate ${generateStatus} | Stream ${streamStatus}`
    )

    totalTests += 2
    if (result.generateText) passedTests++
    if (result.streamText) passedTests++
  })

  console.log(
    `\n🎯 Overall: ${passedTests}/${totalTests} reasoning tests passed (${Math.round((passedTests / totalTests) * 100)}%)`
  )

  if (passedTests === totalTests) {
    console.log('🎉 All reasoning tests completed successfully!')
    process.exit(0)
  } else {
    console.log('⚠️  Some reasoning tests had issues. Check the output above for details.')
    process.exit(1)
  }
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled Rejection:', error)
  process.exit(1)
})

// Run the tests
if (import.meta.main) {
  runReasoningTests().catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })
}

export { testGenerateText, testStreamText }