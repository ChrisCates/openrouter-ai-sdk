#!/usr/bin/env bun
import { generateText, streamText } from 'ai'
import { openrouter } from '@openrouter/sdk-v5'
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
      maxOutputTokens: 500,
      temperature: 0.1,
    })

    // Check for reasoning in response - v5 format
    let hasReasoning = false
    if (result.reasoning && result.reasoning.length > 0) {
      hasReasoning = true
      console.log(`🧠 REASONING TRACE:`)
      result.reasoning.forEach((reasoning, index) => {
        console.log(`${index + 1}. ${reasoning.text}`)
      })
      console.log(`${'─'.repeat(80)}`)
    }

    console.log(`💭 RESPONSE:`)
    console.log(result.text || '(No text response)')

    if (!hasReasoning) {
      console.log(`🧠 No reasoning traces found in generateText response`)
    }

    console.log(`${'─'.repeat(80)}`)
    console.log(
      `📊 USAGE: ${result.usage.inputTokens} input + ${result.usage.outputTokens} output = ${result.usage.totalTokens} total tokens`
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
      maxOutputTokens: 500,
      temperature: 0.1
    })

    console.log(`💭 STREAMING RESPONSE:`)

    // Stream the text to console in real-time
    for await (const delta of result.textStream) {
      process.stdout.write(delta)
    }

    console.log(`\n${'─'.repeat(80)}`)

    // Get final results
    const finalResult = await result.response
    const usage = await result.usage
    const finishReason = await result.finishReason

    // Check for reasoning in the final result - v5 format
    let hasReasoning = false
    if (result.reasoning) {
      const reasoning = await result.reasoning
      if (reasoning && reasoning.length > 0) {
        hasReasoning = true
        console.log(`🧠 REASONING TRACE:`)
        reasoning.forEach((reason, index) => {
          console.log(`${index + 1}. ${reason.text}`)
        })
        console.log(`${'─'.repeat(80)}`)
      }
    }

    if (!hasReasoning) {
      console.log('🧠 No separate reasoning trace found in streaming response')
      console.log(`${'─'.repeat(80)}`)
    }

    console.log(
      `📊 USAGE: ${usage.inputTokens} input + ${usage.outputTokens} output = ${usage.totalTokens} total tokens`
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
  console.log('🧠 OpenRouter AI SDK v5 - Reasoning Tests')
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