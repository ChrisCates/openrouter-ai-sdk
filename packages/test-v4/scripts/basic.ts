#!/usr/bin/env bun
import { generateText } from 'ai'
import { openrouter } from '@openrouter/sdk-v4'
import { ensureApiKey } from '@util/check'
import { models, type TestModel } from '@util/models'

ensureApiKey()

async function testBasicCompletion(model: TestModel): Promise<boolean> {
  const question =
    'What is the capital of France? Please respond in exactly one sentence.'

  try {
    console.log(`\n${'-'.repeat(80)}`)
    console.log(`🤖 MODEL: ${model.name} (${model.slug})`)
    console.log(`${'-'.repeat(80)}`)
    console.log(`❓ QUESTION: ${question}`)
    console.log(`${'─'.repeat(80)}`)

    const result = await generateText({
      model: openrouter(model.slug),
      prompt: question,
      maxTokens: 50,
      temperature: 0.1
    })

    console.log(`💬 RESPONSE: ${result.text}`)
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

async function testConversation(model: TestModel): Promise<boolean> {
  const question = 'Great! Now what is 4 + 4?'

  try {
    console.log(`\n${'-'.repeat(80)}`)
    console.log(`🤖 MODEL: ${model.name} (${model.slug}) - CONVERSATION TEST`)
    console.log(`${'-'.repeat(80)}`)
    console.log(`💭 CONTEXT: Previous exchange about 2+2=4`)
    console.log(`❓ QUESTION: ${question}`)
    console.log(`${'─'.repeat(80)}`)

    const result = await generateText({
      model: openrouter(model.slug),
      messages: [
        { role: 'user', content: 'Hello! What is 2 + 2?' },
        { role: 'assistant', content: '2 + 2 equals 4.' },
        { role: 'user', content: question }
      ],
      maxTokens: 30,
      temperature: 0.1
    })

    console.log(`💬 RESPONSE: ${result.text}`)
    console.log(`${'─'.repeat(80)}`)
    console.log(
      `📊 USAGE: ${result.usage.promptTokens} prompt + ${result.usage.completionTokens} completion = ${result.usage.totalTokens} total tokens`
    )
    console.log(`✅ STATUS: SUCCESS`)

    return true
  } catch (error) {
    console.log(`❌ STATUS: FAILED - ${error}`)
    return false
  }
}

async function runBasicTests() {
  console.log('🚀 OpenRouter AI SDK v4 - Basic Programmatic Tests')
  console.log('-'.repeat(50))

  const testModels = models
  const results: { model: string; basic: boolean; conversation: boolean }[] = []

  for (const model of testModels) {
    const basicResult = await testBasicCompletion(model)
    const conversationResult = await testConversation(model)

    results.push({
      model: model.name,
      basic: basicResult,
      conversation: conversationResult
    })

    // Small delay between tests to be respectful to the API
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  console.log('\n📈 Test Results Summary')
  console.log('-'.repeat(50))

  let totalTests = 0
  let passedTests = 0

  results.forEach((result) => {
    const basicStatus = result.basic ? '✅' : '❌'
    const conversationStatus = result.conversation ? '✅' : '❌'
    console.log(
      `${result.model}: Basic ${basicStatus} | Conversation ${conversationStatus}`
    )

    totalTests += 2
    if (result.basic) passedTests++
    if (result.conversation) passedTests++
  })

  console.log(
    `\n🎯 Overall: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`
  )

  if (passedTests === totalTests) {
    console.log('🎉 All tests passed!')
    process.exit(0)
  } else {
    console.log('⚠️  Some tests failed. Check the output above for details.')
    process.exit(1)
  }
}

// Error handling for uncaught exceptions
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
  runBasicTests().catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })
}

export { testBasicCompletion, testConversation }
