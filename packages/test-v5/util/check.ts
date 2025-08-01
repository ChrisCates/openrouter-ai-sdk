#!/usr/bin/env bun

import { validateApiKey } from '@openrouter/shared'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

function ensureApiKey(): void {
  if (!OPENROUTER_API_KEY) {
    console.error(
      '❌ Error: OPENROUTER_API_KEY environment variable is required'
    )
    console.error('Please set your OpenRouter API key:')
    console.error('  export OPENROUTER_API_KEY=your_key_here')
    console.error('Get your API key from: https://openrouter.ai/settings/keys')
    process.exit(1)
  }

  try {
    validateApiKey(OPENROUTER_API_KEY)
  } catch (error) {
    console.error(
      '❌ Invalid API key format:',
      error instanceof Error ? error.message : error
    )
    console.error('Get your API key from: https://openrouter.ai/settings/keys')
    process.exit(1)
  }
}

// Run the check
if (import.meta.main) {
  console.log('🔐 OpenRouter API Key Validation')
  console.log('-'.repeat(50))

  ensureApiKey()
  console.log('✅ API key format is valid')
  console.log(`🔑 Key prefix: ${OPENROUTER_API_KEY!.substring(0, 8)}...`)
  console.log('📋 Ready to run tests!')
}

export { ensureApiKey }
