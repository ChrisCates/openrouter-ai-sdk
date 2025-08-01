#!/usr/bin/env bun
import { generateText } from 'ai'
import { openrouter } from '@openrouter/sdk-v5'
import { ensureApiKey } from '@util/check'
import { models } from '@util/models'
import { readFileSync } from 'fs'
import { join } from 'path'

ensureApiKey()

// Use the first model from models array (GPT-4o Mini with image capabilities)
const testModel = models[0]
const imagePath = join(import.meta.dir, 'sample', 'test.jpg')

async function debugImageUpload() {
  try {
    console.log('🔍 Reading image file...')
    const imageBuffer = readFileSync(imagePath)
    console.log('🔍 Image buffer size:', imageBuffer.length)
    
    const base64Image = imageBuffer.toString('base64')
    console.log('🔍 Base64 length:', base64Image.length)
    console.log('🔍 Base64 preview:', base64Image.substring(0, 100) + '...')

    // Create messages in the format that should work
    const messages: any = [
      {
        role: 'user',
        content: [
          { 
            type: 'text', 
            text: 'What do you see in this image? Please describe it briefly.' 
          },
          { 
            type: 'image', 
            image: `data:image/jpeg;base64,${base64Image}`
          }
        ]
      }
    ]

    console.log('🔍 Message structure:', JSON.stringify(messages, null, 2))

    console.log('🔍 Calling generateText...')
    const result = await generateText({
      model: openrouter(testModel.slug),
      messages: messages,
      maxOutputTokens: 200,
      temperature: 0.1
    })

    console.log('🔍 Result:', result.text)
    console.log('🔍 Usage:', result.usage)
    
  } catch (error) {
    console.error('🔍 Error:', error)
  }
}

if (import.meta.main) {
  debugImageUpload()
}