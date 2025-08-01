# OpenRouter AI SDK

A refactored version of the OpenRouter AI SDK.

View the sandbox environments for Next.js in [packages/test-v4](packages/test-v4) and [packages/test-v5](packages/test-v5)

## Quick Start

Setup your OpenRouter API key and app information in `.env`

```env
# OpenRouter API Key
# Get your API key from: https://openrouter.ai/settings/keys
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Optional: OpenRouter App Information
# OPENROUTER_APP_NAME=your_app_name
# OPENROUTER_APP_URL=https://your-app-url.com
```

Install package:

```bash
bun install openrouter-ai-sdk
```

Test out v4 and v5 usage:

```ts
import { generateText } from 'ai'
import { openrouter } from 'openrouter-ai-sdk'

const result = await generateText({
    model: openrouter('moonshotai/kimi-k2'),
    messages: [
        { role: 'user', content: 'Hello! What is 2 + 2?' }
    ],
    maxOutputTokens: 30,
    temperature: 0.1
})

console.log(result.content)
```

```ts
import { generateText } from 'ai'
import { openrouter } from 'openrouter-ai-sdk/v4'

const result = await generateText({
    model: openrouter('moonshotai/kimi-k2'),
    messages: [
        { role: 'user', content: 'Hello! What is 2 + 2?' }
    ],
    maxTokens: 30,
    temperature: 0.1
})

console.log(result.text)
```

View more comprehensive examples in [packages/test-v4/scripts](packages/test-v4/scripts) and [packages/test-v5/scripts](packages/test-v5/scripts).
