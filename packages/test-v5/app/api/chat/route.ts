import { streamText, convertToModelMessages } from 'ai'
import { openrouter } from '@openrouter/sdk-v5'
import { heideggerTool } from '../../../tools/heidegger'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

export async function POST(req: Request) {
  if (!OPENROUTER_API_KEY) {
    return Response.json(
      {
        error: 'OPENROUTER_API_KEY environment variable is required'
      },
      { status: 500 }
    )
  }

  try {
    const { messages, model, toolsEnabled = true } = await req.json()

    const result = streamText({
      model: openrouter(model, {
        apiKey: OPENROUTER_API_KEY,
        headers: {
          'HTTP-Referer': 'https://openrouter.ai',
          'X-Title': `OpenRouter SDK v5 React Streaming Demo`
        }
      }),
      messages: convertToModelMessages(messages),
      temperature: 0.7,
      maxOutputTokens: 800,
      toolChoice: toolsEnabled ? 'required' : 'none',
      tools: toolsEnabled ? {
        getHeideggerQuote: heideggerTool
      } : undefined
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('Chat API error:', error)
    return Response.json(
      {
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
