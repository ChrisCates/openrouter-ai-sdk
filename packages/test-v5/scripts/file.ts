#!/usr/bin/env bun
import { generateText, streamText } from 'ai'
import { openrouter } from '@openrouter/sdk-v5'
import { ensureApiKey } from '@util/check'
import { models } from '@util/models'
import { readFileSync } from 'fs'
import { join } from 'path'

ensureApiKey()

// Use the first model from models array (GPT-4o Mini with image capabilities)
const testModel = models[0]
const imagePath = join(import.meta.dir, 'sample', 'test.jpg')

async function testFileUploadGenerate(): Promise<boolean> {
  try {
    console.log(`\n${'-'.repeat(80)}`)
    console.log(`🤖 MODEL: ${testModel.name} (${testModel.slug}) - FILE UPLOAD GENERATE`)
    console.log(`${'-'.repeat(80)}`)
    console.log(`📁 FILE: ${imagePath}`)
    console.log(`❓ QUESTION: What do you see in this image?`)
    console.log(`${'─'.repeat(80)}`)

    // Read image file as buffer
    const imageBuffer = readFileSync(imagePath)

    const result = await generateText({
      model: openrouter(testModel.slug),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'What do you see in this image? Please describe it in detail.'
            },
            {
              type: 'file',
              data: imageBuffer,
              mediaType: 'image/jpeg'
            }
          ]
        }
      ],
      maxOutputTokens: 500,
      temperature: 0.1
    })

    console.log(`💬 RESPONSE: ${result.text}`)
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

async function testFileUploadStream(): Promise<boolean> {
  try {
    console.log(`\n${'-'.repeat(80)}`)
    console.log(`🤖 MODEL: ${testModel.name} (${testModel.slug}) - FILE UPLOAD STREAM`)
    console.log(`${'-'.repeat(80)}`)
    console.log(`📁 FILE: ${imagePath}`)
    console.log(`❓ QUESTION: Analyze this image and tell me about the colors used`)
    console.log(`${'─'.repeat(80)}`)

    // Read image file as buffer
    const imageBuffer = readFileSync(imagePath)

    const result = await streamText({
      model: openrouter(testModel.slug),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this image and tell me about the colors used in it.'
            },
            {
              type: 'file',
              data: imageBuffer,
              mediaType: 'image/jpeg'
            }
          ]
        }
      ],
      maxOutputTokens: 500,
      temperature: 0.1
    })

    console.log(`💭 STREAMING RESPONSE:`)

    // Stream text to console in real-time
    let fullText = ''
    let chunkCount = 0

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

async function runFileUploadTests() {
  console.log('📁 OpenRouter AI SDK v5 - File Upload Tests')
  console.log('-'.repeat(50))
  console.log(`🖼️  Testing with image: ${imagePath}`)
  console.log(`🤖 Using model: ${testModel.name} (${testModel.slug})`)

  const results: {
    generate: boolean
    stream: boolean
  } = {
    generate: false,
    stream: false
  }

  // Test generateText with file upload
  results.generate = await testFileUploadGenerate()

  // Small delay between tests
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Test streamText with file upload
  results.stream = await testFileUploadStream()

  console.log('\n📈 File Upload Test Results Summary')
  console.log('-'.repeat(50))

  const generateStatus = results.generate ? '✅' : '❌'
  const streamStatus = results.stream ? '✅' : '❌'

  console.log(`${testModel.name}: Generate ${generateStatus} | Stream ${streamStatus}`)

  const totalTests = 2
  const passedTests = (results.generate ? 1 : 0) + (results.stream ? 1 : 0)

  console.log(
    `\n🎯 Overall: ${passedTests}/${totalTests} file upload tests passed (${Math.round((passedTests / totalTests) * 100)}%)`
  )

  if (passedTests === totalTests) {
    console.log('🎉 All file upload tests passed!')
    process.exit(0)
  } else {
    console.log('⚠️  Some file upload tests failed. Check the output above for details.')
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
  runFileUploadTests().catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })
}

export { testFileUploadGenerate, testFileUploadStream }