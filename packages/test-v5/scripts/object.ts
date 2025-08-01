#!/usr/bin/env bun
import { generateObject, streamObject } from 'ai'
import { openrouter } from '@openrouter/sdk-v5'
import { ensureApiKey } from '@util/check'
import { models } from '@util/models'
import { z } from 'zod'

ensureApiKey()

// Use the first model from models array (GPT-4o Mini)
const testModel = models[0]

// Define schemas for testing
const recipeSchema = z.object({
  recipe: z.object({
    name: z.string(),
    description: z.string(),
    ingredients: z.array(z.string()),
    steps: z.array(z.string()),
    prepTime: z.number(),
    cookTime: z.number(),
    servings: z.number()
  })
})

const personSchema = z.object({
  name: z.string(),
  age: z.number(),
  occupation: z.string(),
  hobbies: z.array(z.string()),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string()
  })
})

async function testObjectGeneration(): Promise<boolean> {
  try {
    console.log(`\n${'-'.repeat(80)}`)
    console.log(`🤖 MODEL: ${testModel.name} (${testModel.slug}) - OBJECT GENERATION`)
    console.log(`${'-'.repeat(80)}`)
    console.log(`📋 SCHEMA: Recipe with ingredients and steps`)
    console.log(`❓ PROMPT: Generate a simple chocolate chip cookie recipe`)
    console.log(`${'─'.repeat(80)}`)

    const result = await generateObject({
      model: openrouter(testModel.slug),
      schema: recipeSchema,
      prompt: 'Generate a simple chocolate chip cookie recipe. Include only: recipe object with name, description, ingredients (array of strings like "2 cups flour"), steps (array of strings), prepTime (number), cookTime (number), servings (number). Please respond with valid JSON.',
      temperature: 0.1
    })

    console.log(`📦 GENERATED OBJECT:`)
    console.log(JSON.stringify(result.object, null, 2))
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
    console.log(`❌ ERROR TYPE: ${(error as Error).constructor.name}`)
    if ((error as any).responseText) {
      console.log(`❌ RESPONSE TEXT: ${(error as any).responseText}`)
    }
    if ((error as any).response) {
      console.log(`❌ RESPONSE DATA: ${JSON.stringify((error as any).response, null, 2)}`)
    }
    return false
  }
}

async function testObjectStreaming(): Promise<boolean> {
  try {
    console.log(`\n${'-'.repeat(80)}`)
    console.log(`🤖 MODEL: ${testModel.name} (${testModel.slug}) - OBJECT STREAMING`)
    console.log(`${'-'.repeat(80)}`)
    console.log(`📋 SCHEMA: Person with address and hobbies`)
    console.log(`❓ PROMPT: Generate a fictional person profile`)
    console.log(`${'─'.repeat(80)}`)

    const result = await streamObject({
      model: openrouter(testModel.slug),
      schema: personSchema,
      prompt: 'Generate a fictional person profile for a 32-year-old software engineer living in San Francisco. Include only: name, age, occupation, hobbies (array), and address (object with street, city, state, zipCode). Please respond with valid JSON.',
      temperature: 0.3
    })

    console.log(`🌊 STREAMING OBJECT:`)
    
    let partialObjectCount = 0
    for await (const partialObject of result.partialObjectStream) {
      if (partialObjectCount === 0) {
        console.log('Starting stream...')
      }
      partialObjectCount++
      
      // Only show every 5th partial object to avoid spam
      if (partialObjectCount % 5 === 0) {
        console.log(`[Partial ${partialObjectCount}]`, JSON.stringify(partialObject, null, 2))
      }
    }

    // Get final results
    const finalObject = await result.object
    const usage = await result.usage
    const finishReason = await result.finishReason

    console.log(`\n📦 FINAL OBJECT:`)
    console.log(JSON.stringify(finalObject, null, 2))
    console.log(`\n📊 PARTIAL OBJECTS: ${partialObjectCount}`)
    console.log(`${'─'.repeat(80)}`)
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

async function testArrayGeneration(): Promise<boolean> {
  try {
    console.log(`\n${'-'.repeat(80)}`)
    console.log(`🤖 MODEL: ${testModel.name} (${testModel.slug}) - ARRAY GENERATION`)
    console.log(`${'-'.repeat(80)}`)
    console.log(`📋 SCHEMA: Array of simple objects`)
    console.log(`❓ PROMPT: Generate a list of programming languages`)
    console.log(`${'─'.repeat(80)}`)

    const languageSchema = z.object({
      languages: z.array(z.object({
        name: z.string(),
        type: z.enum(['compiled', 'interpreted', 'hybrid']),
        yearCreated: z.number(),
        popularityRank: z.number().describe('Current popularity rank (1-100)')
      }))
    })

    const result = await generateObject({
      model: openrouter(testModel.slug),
      schema: languageSchema,
      prompt: 'Generate a list of 5 popular programming languages. Include only: languages array with objects containing name, type (compiled/interpreted/hybrid), yearCreated (number), popularityRank (number 1-100). Please respond with valid JSON.',
      temperature: 0.2
    })

    console.log(`📦 GENERATED ARRAY:`)
    console.log(JSON.stringify(result.object, null, 2))
    console.log(`${'─'.repeat(80)}`)
    console.log(
      `📊 USAGE: ${result.usage.inputTokens} input + ${result.usage.outputTokens} output = ${result.usage.totalTokens} total tokens`
    )

    console.log(`✅ STATUS: SUCCESS`)
    return true
  } catch (error) {
    console.log(`❌ STATUS: FAILED - ${error}`)
    return false
  }
}

async function runObjectTests() {
  console.log('📦 OpenRouter AI SDK v5 - Structured Object Tests')
  console.log('-'.repeat(50))
  console.log(`🤖 Using model: ${testModel.name} (${testModel.slug})`)

  const results: {
    generation: boolean
    streaming: boolean
    arrays: boolean
  } = {
    generation: false,
    streaming: false,
    arrays: false
  }

  // Test object generation
  results.generation = await testObjectGeneration()

  // Small delay between tests
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Test object streaming
  results.streaming = await testObjectStreaming()

  // Small delay between tests
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Test array generation
  results.arrays = await testArrayGeneration()

  console.log('\n📈 Object Test Results Summary')
  console.log('-'.repeat(50))

  const generationStatus = results.generation ? '✅' : '❌'
  const streamingStatus = results.streaming ? '✅' : '❌'
  const arraysStatus = results.arrays ? '✅' : '❌'

  console.log(`${testModel.name}: Generation ${generationStatus} | Streaming ${streamingStatus} | Arrays ${arraysStatus}`)

  const totalTests = 3
  const passedTests = (results.generation ? 1 : 0) + (results.streaming ? 1 : 0) + (results.arrays ? 1 : 0)

  console.log(
    `\n🎯 Overall: ${passedTests}/${totalTests} object tests passed (${Math.round((passedTests / totalTests) * 100)}%)`
  )

  if (passedTests === totalTests) {
    console.log('🎉 All object tests passed!')
    process.exit(0)
  } else {
    console.log('⚠️  Some object tests failed. Check the output above for details.')
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
  runObjectTests().catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })
}

export { testObjectGeneration, testObjectStreaming, testArrayGeneration }