#!/usr/bin/env bun
import { streamText } from 'ai'
import { openrouter } from '@openrouter/sdk-v4'
import { ensureApiKey } from '@util/check'
import { models, type TestModel } from '@util/models'

ensureApiKey()

async function testStreamingCompletion(model: TestModel): Promise<boolean> {
  const question =
    'Write a short haiku about programming. Be creative and concise.'

  try {
    console.log(`\n${'-'.repeat(80)}`)
    console.log(`🤖 MODEL: ${model.name} (${model.slug}) - STREAMING`)
    console.log(`${'-'.repeat(80)}`)
    console.log(`❓ QUESTION: ${question}`)
    console.log(`${'─'.repeat(80)}`)
    console.log(`🌊 STREAMING RESPONSE:`)

    const result = await streamText({
      model: openrouter(model.slug),
      prompt: question,
      maxTokens: 100,
      temperature: 0.7
    })

    let fullText = ''
    let chunkCount = 0

    for await (const delta of result.textStream) {
      process.stdout.write(delta)
      fullText += delta
      chunkCount++
    }

    console.log(`\n${'─'.repeat(80)}`)
    console.log(`📦 CHUNKS: ${chunkCount}`)

    const usage = await result.usage
    const finishReason = await result.finishReason

    console.log(
      `📊 USAGE: ${usage.promptTokens} prompt + ${usage.completionTokens} completion = ${usage.totalTokens} total tokens`
    )
    console.log(`🏁 FINISH: ${finishReason}`)
    console.log(`💬 FULL RESPONSE: "${fullText.trim()}"`)

    // Validate that we received some content
    if (fullText.trim().length === 0) {
      console.log(`❌ STATUS: FAILED - No content received`)
      return false
    }

    console.log(`✅ STATUS: SUCCESS`)
    return true
  } catch (error) {
    console.log(`❌ STATUS: FAILED - ${error}`)
    return false
  }
}

async function testStreamingConversation(model: TestModel): Promise<boolean> {
  const question = 'Great! Now can you count from 6 to 10?'

  try {
    console.log(`\n${'-'.repeat(80)}`)
    console.log(
      `🤖 MODEL: ${model.name} (${model.slug}) - STREAMING CONVERSATION`
    )
    console.log(`${'-'.repeat(80)}`)
    console.log(`💭 CONTEXT: Previous counting from 1 to 5`)
    console.log(`❓ QUESTION: ${question}`)
    console.log(`${'─'.repeat(80)}`)
    console.log(`🌊 STREAMING RESPONSE:`)

    const result = await streamText({
      model: openrouter(model.slug),
      messages: [
        { role: 'user', content: 'Hello! Can you count from 1 to 5?' },
        { role: 'assistant', content: 'Of course! 1, 2, 3, 4, 5.' },
        { role: 'user', content: question }
      ],
      maxTokens: 50,
      temperature: 0.1
    })

    let fullText = ''
    let chunkCount = 0

    for await (const delta of result.textStream) {
      process.stdout.write(delta)
      fullText += delta
      chunkCount++
    }

    console.log(`\n${'─'.repeat(80)}`)
    console.log(`📦 CHUNKS: ${chunkCount}`)

    const usage = await result.usage

    console.log(
      `📊 USAGE: ${usage.promptTokens} prompt + ${usage.completionTokens} completion = ${usage.totalTokens} total tokens`
    )
    console.log(`💬 FULL RESPONSE: "${fullText.trim()}"`)
    console.log(`✅ STATUS: SUCCESS`)

    return true
  } catch (error) {
    console.log(`❌ STATUS: FAILED - ${error}`)
    return false
  }
}

async function testStreamingWithSettings(model: TestModel): Promise<boolean> {
  const question = 'Explain what makes a good API in one sentence.'

  try {
    console.log(`\n${'-'.repeat(80)}`)
    console.log(
      `🤖 MODEL: ${model.name} (${model.slug}) - STREAMING WITH CUSTOM SETTINGS`
    )
    console.log(`${'-'.repeat(80)}`)
    console.log(
      `⚙️ SETTINGS: temperature=0.8, topP=0.9, freq/presence penalty=0.1`
    )
    console.log(`❓ QUESTION: ${question}`)
    console.log(`${'─'.repeat(80)}`)
    console.log(`🌊 STREAMING RESPONSE:`)

    const result = await streamText({
      model: openrouter(model.slug, {
        // Test various OpenRouter-specific settings
        temperature: 0.8,
        topP: 0.9,
        frequencyPenalty: 0.1,
        presencePenalty: 0.1
      }),
      prompt: question,
      maxTokens: 60
    })

    let fullText = ''

    for await (const delta of result.textStream) {
      process.stdout.write(delta)
      fullText += delta
    }

    console.log(`\n${'─'.repeat(80)}`)

    const usage = await result.usage

    console.log(
      `📊 USAGE: ${usage.promptTokens} prompt + ${usage.completionTokens} completion = ${usage.totalTokens} total tokens`
    )
    console.log(`💬 FULL RESPONSE: "${fullText.trim()}"`)
    console.log(`✅ STATUS: SUCCESS`)

    return true
  } catch (error) {
    console.log(`❌ STATUS: FAILED - ${error}`)
    return false
  }
}

async function runStreamingTests() {
  console.log('🌊 OpenRouter AI SDK v4 - Streaming Programmatic Tests')
  console.log('-'.repeat(60))

  const testModels = models

  // Filter to only models that support streaming
  const streamingModels = testModels.filter((model) => model.streaming)

  if (streamingModels.length === 0) {
    console.log('⚠️  No streaming-capable models found in models.json')
    process.exit(1)
  }

  console.log(`🎯 Testing ${streamingModels.length} streaming-capable models`)

  const results: {
    model: string
    basic: boolean
    conversation: boolean
    customSettings: boolean
  }[] = []

  for (const model of streamingModels) {
    const basicResult = await testStreamingCompletion(model)
    const conversationResult = await testStreamingConversation(model)
    const customSettingsResult = await testStreamingWithSettings(model)

    results.push({
      model: model.name,
      basic: basicResult,
      conversation: conversationResult,
      customSettings: customSettingsResult
    })

    // Delay between tests to be respectful to the API
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  console.log('\n📈 Streaming Test Results Summary')
  console.log('-'.repeat(60))

  let totalTests = 0
  let passedTests = 0

  results.forEach((result) => {
    const basicStatus = result.basic ? '✅' : '❌'
    const conversationStatus = result.conversation ? '✅' : '❌'
    const customStatus = result.customSettings ? '✅' : '❌'

    console.log(`${result.model}:`)
    console.log(`  📝 Basic streaming: ${basicStatus}`)
    console.log(`  💬 Conversation streaming: ${conversationStatus}`)
    console.log(`  ⚙️  Custom settings: ${customStatus}`)

    totalTests += 3
    if (result.basic) passedTests++
    if (result.conversation) passedTests++
    if (result.customSettings) passedTests++
  })

  console.log(
    `\n🎯 Overall: ${passedTests}/${totalTests} streaming tests passed (${Math.round((passedTests / totalTests) * 100)}%)`
  )

  if (passedTests === totalTests) {
    console.log('🎉 All streaming tests passed!')
    process.exit(0)
  } else {
    console.log(
      '⚠️  Some streaming tests failed. Check the output above for details.'
    )
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
  runStreamingTests().catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })
}

export {
  testStreamingCompletion,
  testStreamingConversation,
  testStreamingWithSettings
}
